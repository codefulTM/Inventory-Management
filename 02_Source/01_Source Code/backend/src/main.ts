import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // lấy cấu hình từ ConfigService
  const config = app.get(ConfigService);
  const port = config.get<string>('PORT') ?? '3001';
  const frontendOrigin =
    config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:5173';

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

  // lấy cổng từ ConfigService (đọc từ env hoặc nơi khác)
  // bật ValidationPipe toàn cục để xử lý các DTO
  // whitelist loại bỏ các thuộc tính không khai báo trong DTO,
  // transform tự động convert payload thành instance class
  // app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new (require('@nestjs/common').ValidationPipe)({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(parseInt(port, 10));

  console.log(`Backend is running on: ${await app.getUrl()}`);
  console.log(`CORS origin: ${frontendOrigin}`);
}
bootstrap();
