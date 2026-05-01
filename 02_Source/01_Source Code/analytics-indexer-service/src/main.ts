import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  // No HTTP server — pure background worker
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();

  const logger = new Logger('Bootstrap');
  logger.log('analytics-indexer-service started (ApplicationContext mode)');
}

bootstrap().catch((err) => {
  console.error('Fatal error during bootstrap', err);
  process.exit(1);
});
