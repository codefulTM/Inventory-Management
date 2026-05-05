import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { KeycloakGrpcClientService, KEYCLOAK_GRPC_CLIENT } from './keycloak-grpc-client.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: KEYCLOAK_GRPC_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: { package: 'auth', protoPath: join(__dirname, '../../../proto/auth.proto'), url: config.get<string>('KEYCLOAK_SERVICE_GRPC_URL', 'localhost:50051') },
        }),
      },
    ]),
  ],
  providers: [KeycloakGrpcClientService],
  exports: [KeycloakGrpcClientService],
})
export class KeycloakGrpcClientModule {}
