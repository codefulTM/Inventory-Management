/**
 * File: proxy.controller.ts
 * Mô tả: Reverse Proxy Controller — chuyển tiếp HTTP request đến backend/ai-service
 * Chức năng: Đóng vai trò reverse proxy, forward mọi request không thuộc /auth/* và /reports/*
 * 
 * Cơ chế routing:
 * - /ai/* và /ai-agents/* → ai-service (http://localhost:3003)
 * - Còn lại → backend service (http://localhost:3001)
 * 
 * Sử dụng native fetch() của Node.js để forward request,
 * giữ nguyên method, body, headers (bao gồm Authorization)
 * 
 * Hỗ trợ binary response (PDF, image) — không decode thành text
 */
import {
  All,
  Controller,
  Logger,
  Req,
  Res,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { ConfigService } from "@nestjs/config";

/**
 * ProxyController — chuyển tiếp tất cả HTTP request (trừ /auth/*, /reports/*)
 * đến backend service hoặc ai-service tùy theo đường dẫn
 * 
 * Chiến lược: HTTP reverse proxy qua native fetch()
 * Backend đã có REST API sẵn, gateway chỉ cần forward request
 * giữ nguyên method, body và Authorization header
 * 
 * Tương lai: Một số route có thể thay bằng gRPC khi cần
 */
@Controller()
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);
  private readonly backendUrl: string;   // URL của backend service (NestJS, port 3001)
  private readonly aiServiceUrl: string; // URL của AI service (port 3003)

  constructor(private readonly config: ConfigService) {
    // Ưu tiên BACKEND_URL, fallback sang BACKEND_HTTP_URL, cuối cùng là localhost:3001
    this.backendUrl =
      config.get<string>("BACKEND_URL") ??
      config.get<string>("BACKEND_HTTP_URL", "http://localhost:3001");
    // AI service URL, mặc định localhost:3003
    this.aiServiceUrl = config.get<string>(
      "AI_SERVICE_URL",
      "http://localhost:3003",
    );
  }

  /**
   * Proxy tất cả route (trừ /auth/*, /reports/*) đến backend hoặc ai-service
   * Route pattern: *path (wildcard — khớp mọi đường dẫn)
   * 
   * Logic routing:
   * - /reports/* → Trả về 404 (đã có ReportsController xử lý riêng qua gRPC)
   * - /ai/*, /ai-agents/* → Forward đến ai-service
   * - Còn lại → Forward đến backend service
   */
  @All("*path")
  async proxy(@Req() req: Request, @Res() res: Response) {
    // Chặn /reports/* — để ReportsController xử lý qua gRPC
    if (req.path.startsWith("/reports/") || req.path === "/reports") {
      return res.status(404).json({ message: "Not Found" });
    }

    // Xác định service đích: AI routes hay backend routes
    const isAiRoute =
      req.path.startsWith("/ai/") ||
      req.path === "/ai" ||
      req.path.startsWith("/ai-agents/") ||
      req.path === "/ai-agents";
    const baseUrl = isAiRoute ? this.aiServiceUrl : this.backendUrl;
    // Xây dựng URL đích: base + path + query string
    const targetUrl = `${baseUrl}${req.path}${this.buildQueryString(req.query)}`;

    this.logger.debug(
      `[proxy] ${req.method} ${req.path} → ${targetUrl} (${isAiRoute ? "ai-service" : "backend"})`,
    );

    try {
      // Xây dựng headers cho request forward đến upstream
      const headers: Record<string, string> = {
        "content-type": req.headers["content-type"] ?? "application/json",
        // Chuyển tiếp IP thực của client (hỗ trợ proxy chain)
        "x-forwarded-for":
          (req.headers["x-forwarded-for"] as string) ??
          req.socket?.remoteAddress ??
          "",
        "x-forwarded-host": req.hostname,  // Hostname của gateway
        "user-agent": req.headers["user-agent"] ?? "",  // User-Agent của client gốc
      };

      // Forward Authorization header để upstream xác thực JWT
      if (req.headers["authorization"]) {
        headers["authorization"] = req.headers["authorization"] as string;
      }

      // Chỉ gửi body cho các method có payload (POST, PUT, PATCH)
      const hasBody = ["POST", "PUT", "PATCH"].includes(
        req.method.toUpperCase(),
      );
      const body = hasBody ? JSON.stringify(req.body) : undefined;

      // Gửi request đến upstream service bằng native fetch
      const upstream = await fetch(targetUrl, {
        method: req.method,
        headers,
        body,
      });

      // Xác định loại response để xử lý đúng cách
      const contentType =
        upstream.headers.get("content-type") ?? "application/json";

      // Response nhị phân (PDF, image, v.v.) phải forward dưới dạng raw buffer
      // vì text() sẽ làm hỏng dữ liệu nhị phân
      const isBinary =
        contentType.includes("application/pdf") ||
        contentType.includes("application/octet-stream") ||
        contentType.includes("image/");

      // Đọc response body: binary → Buffer, text → string
      const responseBody = isBinary
        ? Buffer.from(await upstream.arrayBuffer())
        : await upstream.text();

      // Forward Content-Disposition header nếu có (vd: tên file khi download PDF)
      const disposition = upstream.headers.get("content-disposition");
      if (disposition) {
        res.set("content-disposition", disposition);
      }

      // Trả response từ upstream về client với đúng status code và content-type
      res
        .status(upstream.status)
        .set("content-type", contentType)
        .send(responseBody);
    } catch (err) {
      // Xử lý lỗi khi không thể kết nối đến upstream service
      const e: any = err;
      const errMsg = e?.message ?? String(err);
      this.logger.error(`[proxy] Error forwarding request: ${errMsg}`);
      // Trả về 502 Bad Gateway khi upstream không khả dụng
      throw new HttpException(
        "Backend service unavailable",
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Xây dựng query string từ object query parameters
   * @param query - Object chứa các key-value query params
   * @returns Chuỗi query string (vd: "?page=1&limit=20"), hoặc "" nếu không có params
   */
  private buildQueryString(query: Record<string, any>): string {
    const keys = Object.keys(query);
    if (keys.length === 0) return "";
    return (
      "?" + new URLSearchParams(query as Record<string, string>).toString()
    );
  }
}
