import { Module, Global } from '@nestjs/common';
import { KeycloakService } from './keycloak.service';
import { KeycloakAdminGrpcController } from './keycloak.admin.grpc.controller';

/**
 * KeycloakModule — Global module.
 * Cung cấp KeycloakService + exposes gRPC admin endpoints.
 */
@Global()
@Module({
  controllers: [KeycloakAdminGrpcController],
  providers: [KeycloakService],
  exports: [KeycloakService],
})
export class KeycloakModule {}
