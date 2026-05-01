import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'metrics',
      protoPath: join(__dirname, '../proto/metrics.proto'),
      url: `0.0.0.0:${process.env.GRPC_PORT ?? '6741'}`,
      loader: {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: false,
        oneofs: true,
      },
    },
  });

  await app.listen();
  console.log(`metrics-service gRPC listening on port ${process.env.GRPC_PORT ?? '6741'}`);
}

bootstrap();
