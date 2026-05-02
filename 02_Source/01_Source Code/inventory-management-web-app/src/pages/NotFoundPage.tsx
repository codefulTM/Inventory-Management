/**
 * Not Found Page (404)
 * Trang hiển thị khi người dùng truy cập route không tồn tại
 * Có link về trang chủ và danh sách phiếu kho
 */

import React from "react";
import { Link } from "react-router-dom";

/**
 * NotFoundPage - Component hiển thị lỗi 404
 */
export default function NotFoundPage() {
  return (
    <div className="p-8 text-center">
      <h1>404 — Không tìm thấy trang</h1>
      <p>Trang bạn yêu cầu không tồn tại hoặc đã bị xóa.</p>
      <div className="mt-4">
        <Link to="/">Về trang chủ</Link>
        <span className="mx-2 text-gray-400">·</span>
        <Link to="/operator/warehouse-slips">Danh sách phiếu kho</Link>
      </div>
    </div>
  );
}
