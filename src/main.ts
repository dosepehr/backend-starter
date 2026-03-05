import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import { swaggerConfig } from 'config/swagger.config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ResponseInterceptor } from 'utils/interceptors/response.interceptor';
import { HttpExceptionFilter } from 'utils/filters/http-exception.filter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppLogger } from 'utils/common/logger/logger.service';
import { LoggingInterceptor } from 'utils/common/logger/logger.interceptor';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // Logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  const appLogger = app.get(AppLogger);

  // Security
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          scriptSrc: [`'self'`, `https: 'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
          connectSrc: [`'self'`],
        },
      },
    }),
  );

  // Compression
  app.use(compression());

  // Global Pipes / Filters / Interceptors 
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  const reflector = app.get(Reflector);

  // Log every request/response and format all outgoing responses
  app.useGlobalInterceptors(
    new LoggingInterceptor(appLogger),
    new ResponseInterceptor(reflector),
  );

  // Catch and format all thrown exceptions into a standard error shape
  app.useGlobalFilters(new HttpExceptionFilter(appLogger));

  // Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.setGlobalPrefix('api');

  // Swagger
  const documentFactory = () =>
    SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, documentFactory);

  // Graceful Shutdown
  app.enableShutdownHooks();

  // Start
  const PORT = process.env.PORT ?? 3000;
  const ENV = process.env.NODE_ENV ?? 'development';

  await app.listen(PORT);

  appLogger.log(`Environment : ${ENV}`, 'Bootstrap');
  appLogger.log(`App         : http://localhost:${PORT}`, 'Bootstrap');
  appLogger.log(`Swagger     : http://localhost:${PORT}/api/docs`, 'Bootstrap');
}

bootstrap();
