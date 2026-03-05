import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import { swaggerConfig } from 'config/swagger.config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
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
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ResponseInterceptor(reflector));
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.setGlobalPrefix('api');
  // swagger config
  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, documentFactory);

  const PORT = process.env.APP_PORT ?? 3000;
  const ENV = process.env.APP_ENV ?? 'development';

  await app.listen(PORT);

  console.log(`✅ Environment  : ${ENV}`);
  console.log(`✅ Database     : connected`);
  console.log(`🚀 App          : http://localhost:${PORT}`);
  console.log(`📚 Swagger      : http://localhost:${PORT}/api/docs`);
}
bootstrap();
