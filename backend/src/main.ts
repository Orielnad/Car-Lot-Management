import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { hebrewValidationExceptionFactory } from './common/validation/hebrew-validation-messages';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: hebrewValidationExceptionFactory,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  // Content-Disposition isn't in the CORS default-safelisted response headers,
  // so the browser strips it before frontend JS can read it — needed to name
  // a downloaded file after its real filename (see DocumentsController#download).
  // FRONTEND_URL restricts CORS to the deployed frontend's real origin in
  // production; left unset (allow-all) it's still convenient for local dev.
  const frontendUrl = process.env.FRONTEND_URL;
  app.enableCors({
    origin: frontendUrl ? frontendUrl.split(',').map((url) => url.trim()) : true,
    exposedHeaders: ['Content-Disposition'],
  });

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
}

bootstrap();
