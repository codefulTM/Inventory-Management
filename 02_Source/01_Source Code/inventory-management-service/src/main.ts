import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { NestExpressApplication } from '@nestjs/platform-express';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // lấy cấu hình từ ConfigService
  const config = app.get(ConfigService);
  const port = config.get<string>('PORT') ?? '3001';
  const frontendOrigin =
    config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:5173';

  // Enable trust proxy để lấy IP thực từ X-Forwarded-For header
  app.getHttpAdapter().getInstance().set('trust proxy', true);

  // Cấu hình CORS: cho phép các nguồn, phương thức, header và credentials cụ thể
  app.enableCors({
    origin: frontendOrigin.split(',').map((url) => url.trim()), // support multiple origins separated by comma
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-User-Role',
      'X-User-Id',
    ],
    credentials: true, // cho phép cookie và header xác thực
    preflightContinue: false, // truyền phản hồi preflight cho bộ xử lý tiếp theo
    optionsSuccessStatus: 204,
  });

  // bật ValidationPipe toàn cục để xử lý các DTO
  // whitelist loại bỏ các thuộc tính không khai báo trong DTO,
  // transform tự động convert payload thành instance class
  // forbidNonWhitelisted trả về lỗi nếu có thuộc tính không khai báo trong DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // ── gRPC microservice transport (for api-gateway to call) ──────────────────
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'inventory',
      protoPath: join(__dirname, '../proto/inventory.proto'),
      url: `0.0.0.0:${config.get<string>('GRPC_PORT', '50052')}`,
    },
  });

  await app.startAllMicroservices();
  await app.listen(parseInt(port, 10));

  console.log(`Backend is running on: ${await app.getUrl()}`);
  console.log(`Backend gRPC on port: ${config.get('GRPC_PORT', '50052')}`);
  console.log(`CORS origin: ${frontendOrigin}`);
}
bootstrap();
