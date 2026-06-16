import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const port = process.env.PORT;
  const baseUrl = process.env.BASE_URL;
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.setGlobalPrefix('api');

  app.useGlobalPipes(new ValidationPipe());

  await app.listen(8080, () => {
    console.log('START ===>', `${baseUrl}:${port}/api`);
  });
}
bootstrap();
