// File: App.tsx
// Component gốc (root component) của ứng dụng
// Bọc toàn bộ ứng dụng trong ErrorBoundary để bắt và xử lý lỗi toàn cục
// Sau đó cung cấp routing thông qua RouterProvider

import { RouterProvider } from "react-router-dom";
import { router } from "./router"; // Cấu hình routes từ file router/index.tsx
import ErrorBoundary from "./components/error/ErrorBoundary"; // Component bắt lỗi toàn cục
import "./App.css"; // Styles riêng cho component App

function App() {
  return (
    // ErrorBoundary: Bắt và xử lý lỗi trong toàn bộ component tree con
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}

export default App;
