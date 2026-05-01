import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService)

  // Enable CORS for frontend (configurable via FRONTEND_ORIGIN)
  const frontendOrigin = configService.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:4000'

  app.enableCors({
    origin: frontendOrigin,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  })

  console.log(`CORS enabled for origin: ${frontendOrigin}`)

  const port = configService.get<number | string>('PORT') ?? 3000
  await app.listen(port);
}
bootstrap();
