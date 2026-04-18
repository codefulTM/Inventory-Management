import {
  All,
  Controller,
  Logger,
  Req,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

/**
 * ProxyController — forwards all non-auth HTTP requests to the backend service.
 *
 * Strategy: HTTP reverse proxy (via native fetch).
 * The backend exposes its existing REST API; the gateway simply forwards
 * requests preserving method, body, and Authorization header.
 *
 * Note: In a future phase, specific gRPC RPCs can replace individual proxy
 * routes as needed.
 */
@Controller()
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);
  private readonly backendUrl: string;
  private readonly aiServiceUrl: string;

  constructor(private readonly config: ConfigService) {
    this.backendUrl =
      config.get<string>('BACKEND_URL') ??
      config.get<string>('BACKEND_HTTP_URL', 'http://localhost:3001');
    this.aiServiceUrl =
      config.get<string>('AI_SERVICE_URL', 'http://localhost:3003');
  }

  /**
   * Proxy all routes (except /auth/*, /reports/*) to the backend or ai-service.
   * Routes /ai/* and /ai-agents/* are forwarded to ai-service.
   * Routes /reports/* are handled by ReportsController (gRPC → metrics-service).
   * Route pattern: * (wildcard, excluding auth and reports prefixes)
   */
  @All('*path')
  async proxy(@Req() req: Request, @Res() res: Response) {
    // Guard: /reports/* is handled by ReportsController, not this proxy
    if (req.path.startsWith('/reports/') || req.path === '/reports') {
      return res.status(404).json({ message: 'Not Found' });
    }

    const isAiRoute = req.path.startsWith('/ai/') || req.path === '/ai' ||
      req.path.startsWith('/ai-agents/') || req.path === '/ai-agents';
    const baseUrl = isAiRoute ? this.aiServiceUrl : this.backendUrl;
    const targetUrl = `${baseUrl}${req.path}${this.buildQueryString(req.query)}`;

    this.logger.debug(`[proxy] ${req.method} ${req.path} → ${targetUrl} (${isAiRoute ? 'ai-service' : 'backend'})`);

    try {
      const headers: Record<string, string> = {
        'content-type': req.headers['content-type'] ?? 'application/json',
        'x-forwarded-for': (req.headers['x-forwarded-for'] as string) ?? req.socket?.remoteAddress ?? '',
        'x-forwarded-host': req.hostname,
        'user-agent': req.headers['user-agent'] ?? '',
      };

      if (req.headers['authorization']) {
        headers['authorization'] = req.headers['authorization'] as string;
      }

      const hasBody = ['POST', 'PUT', 'PATCH'].includes(req.method.toUpperCase());
      const body = hasBody ? JSON.stringify(req.body) : undefined;

      const upstream = await fetch(targetUrl, {
        method: req.method,
        headers,
        body,
      });

      const contentType = upstream.headers.get('content-type') ?? 'application/json';
      const responseBody = await upstream.text();

      res.status(upstream.status).set('content-type', contentType).send(responseBody);
    } catch (err) {
      this.logger.error(`[proxy] Error forwarding request: ${err.message}`);
      throw new HttpException('Backend service unavailable', HttpStatus.BAD_GATEWAY);
    }
  }

  private buildQueryString(query: Record<string, any>): string {
    const keys = Object.keys(query);
    if (keys.length === 0) return '';
    return '?' + new URLSearchParams(query as Record<string, string>).toString();
  }
}
