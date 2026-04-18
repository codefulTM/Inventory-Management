import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  // ── HTTP app (health, direct access) ──────────────────────────────────────
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors();

  // ── gRPC microservice ─────────────────────────────────────────────────────
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: ['auth'],
      protoPath: [join(__dirname, '../proto/auth.proto')],
      url: `0.0.0.0:${process.env.GRPC_PORT ?? 50051}`,
      loader: {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: false,
        oneofs: true,
      },
    },
  });

  await app.startAllMicroservices();
  const port = process.env.PORT ?? 3002;
  await app.listen(port);
  console.log(`[keycloak-service] HTTP listening on :${port}`);
  console.log(`[keycloak-service] gRPC listening on :${process.env.GRPC_PORT ?? 50051}`);
}

bootstrap();
