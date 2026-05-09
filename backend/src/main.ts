import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './realtime/redis-io.adapter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    app.useWebSocketAdapter(new RedisIoAdapter(app, redisUrl));
  } else {
    app.useWebSocketAdapter(new IoAdapter(app));
  }
  app.use(
    helmet({
      // Allow browser dashboard (another origin) to read JSON responses reliably
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression());
  app.setGlobalPrefix('api/v1');

  const isProd = process.env.NODE_ENV === 'production';
  const corsList =
    process.env.CORS_ORIGINS?.split(',')
      .map((o) => o.trim())
      .filter(Boolean) ?? [];
  // Dev: reflect requesting origin (covers localhost vs 127.0.0.1 vs ::1 quirks). Prod: explicit list.
  app.enableCors({
    origin: isProd ? (corsList.length > 0 ? corsList : true) : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
}
bootstrap().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
