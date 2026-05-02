// File: main.tsx
// Điểm khởi đầu (entry point) của ứng dụng React frontend
// Chịu trách nhiệm mount React app vào DOM và thiết lập routing

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./index.css"; // Styles chung cho toàn bộ ứng dụng
import { router } from "./router/index.tsx"; // Cấu hình routes của ứng dụng

// Khởi tạo React app và render vào phần tử có id="root" trong index.html
// StrictMode giúp phát hiện các vấn đề tiềm ẩn trong quá trình development
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
