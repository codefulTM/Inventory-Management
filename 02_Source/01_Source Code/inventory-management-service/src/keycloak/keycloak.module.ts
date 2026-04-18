import { Module, Global } from '@nestjs/common';
import { KeycloakService } from './keycloak.service';

/**
 * KeycloakModule — Global module.
 * Cung cấp KeycloakService cho toàn bộ ứng dụng mà không cần import lại.
 */
@Global()
@Module({
  providers: [KeycloakService],
  exports: [KeycloakService],
})
export class KeycloakModule {}
