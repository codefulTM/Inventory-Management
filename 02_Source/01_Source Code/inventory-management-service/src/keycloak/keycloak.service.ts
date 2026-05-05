// === keycloak.service.ts (inventory-service) ===
// Service tương tác với Keycloak Identity Provider (NestJS backend)
// Methods: getAdminToken, loginUser, refreshToken, logoutUser, createUser, updateUser, deleteUser, resetPassword, assignRealmRole, introspectToken
// Config: KEYCLOAK_SERVER_URL, KEYCLOAK_REALM, KEYCLOAK_ADMIN_CLIENT_ID/SECRET, KEYCLOAK_LOGIN_CLIENT_ID/SECRET
// API: Keycloak Admin REST API, OAuth2 token endpoint