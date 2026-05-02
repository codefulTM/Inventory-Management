/**
 * KeycloakGrpcClientModule - Module gRPC client kết nối đến Keycloak Service
 *
 * Chức năng:
 * - Tạo gRPC client để gọi Keycloak Service (auth-service)
 * - Sử dụng thay vì gọi trực tiếp Keycloak REST API
 * - Giao tiếp qua file proto: auth.proto
 * - URL cấu hình qua env: KEYCLOAK_SERVICE_GRPC_URL (mặc định: localhost:50051)
 *
 * Sử dụng: Import vào UserModule để thay thế KeycloakService trực tiếp
 * Lợi ích: Giảm coupling, cải thiện performance so với HTTP REST
 */
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import {
  KeycloakGrpcClientService,
  KEYCLOAK_GRPC_CLIENT,
} from './keycloak-grpc-client.service';

/**
 * KeycloakGrpcClientModule — registers the gRPC client pointing to keycloak-service.
 * Import this in UserModule to replace direct KeycloakService usage.
 */
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: KEYCLOAK_GRPC_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'auth',
            protoPath: join(__dirname, '../../../proto/auth.proto'),
            url: config.get<string>(
              'KEYCLOAK_SERVICE_GRPC_URL',
              'localhost:50051',
            ),
          },
        }),
      },
    ]),
  ],
  providers: [KeycloakGrpcClientService],
  exports: [KeycloakGrpcClientService],
})
export class KeycloakGrpcClientModule {}
