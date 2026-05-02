/// <reference types="vite/client" />
// File: env.d.ts
// Khai báo định nghĩa kiểu (type definitions) cho Vite environment variables
// File này giúp TypeScript hiểu các biến môi trường VITE_*

interface ImportMetaEnv {
  // VITE_API_URL: URL của backend API (ví dụ: http://localhost:3001)
  // Được cấu hình trong file .env của frontend
  readonly VITE_API_URL?: string;

  // Thêm các biến môi trường VITE_ khác tại đây khi cần thiết
  // Ví dụ: VITE_KEYCLOAK_URL, VITE_APP_NAME, etc.
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
