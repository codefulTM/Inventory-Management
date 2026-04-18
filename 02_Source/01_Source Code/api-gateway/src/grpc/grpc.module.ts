import { Module, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';

export const AUTH_SERVICE_TOKEN = 'AUTH_GRPC_CLIENT';
export const METRICS_SERVICE_TOKEN = 'METRICS_GRPC_CLIENT';

/**
 * GrpcModule — registers gRPC clients for downstream services.
 * AUTH_GRPC_CLIENT    → keycloak-service (:50051)
 * METRICS_GRPC_CLIENT → metrics-service  (:6741)
 */
@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: AUTH_SERVICE_TOKEN,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'auth',
            protoPath: join(__dirname, '../../proto/auth.proto'),
            url: config.get<string>('KEYCLOAK_SERVICE_GRPC_URL', 'localhost:50051'),
            loader: {
              keepCase: true,
              longs: String,
              enums: String,
              defaults: false,
              oneofs: true,
            },
          },
        }),
      },
      {
        name: METRICS_SERVICE_TOKEN,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'metrics',
            protoPath: join(__dirname, '../../proto/metrics.proto'),
            url: config.get<string>('METRICS_SERVICE_GRPC_URL', 'localhost:6741'),
            loader: {
              keepCase: true,
              longs: String,
              enums: String,
              defaults: false,
              oneofs: true,
            },
          },
        }),
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class GrpcModule {}
