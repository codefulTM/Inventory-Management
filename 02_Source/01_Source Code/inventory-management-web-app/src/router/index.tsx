// === router/index.tsx ===
// Cấu hình React Router v6 với RBAC
// Routes: /admin/*, /qc/*, /manager/*, /operator/*, /ai/*, /auth/*
// Helpers: ProtectedRoute, requireAuth, requireManagerAuth, requireOperatorAuth, requireQCAuth, requireAdminAuth, HomeRedirect
// Auth: localStorage auth_token + user JSON, isTokenValid() check