import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import { swaggerConfig } from 'config/swagger.config';
import { ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from 'utils/interceptors/response.interceptor';
import { HttpExceptionFilter } from 'utils/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // ignores unused fields
      forbidNonWhitelisted: false, // returns error for unused fields
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
  // swagger config
  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, documentFactory);

  // global port
  const PORT = process.env.PORT ?? 3000;
  console.log(`app is running on port ${PORT}`);
  await app.listen(PORT);
}
bootstrap();
