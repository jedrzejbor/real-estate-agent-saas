import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { registerLocalPublicUploadAssets } from './common/file-storage.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  const trustedProxyCidrs = process.env.TRUSTED_PROXY_CIDRS
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  if (trustedProxyCidrs?.length) {
    app.getHttpAdapter().getInstance().set('trust proxy', trustedProxyCidrs);
  }

  registerLocalPublicUploadAssets(app);

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}`);
}

bootstrap();
