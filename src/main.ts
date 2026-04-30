import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import { swaggerConfig } from 'config/swagger.config';
import {
  BadRequestException,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ResponseInterceptor } from 'utils/interceptors/response.interceptor';
import { HttpExceptionFilter } from 'utils/filters/http-exception.filter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppLogger } from 'utils/common/logger/logger.service';
import { LoggingInterceptor } from 'utils/common/logger/logger.interceptor';
import helmet from 'helmet';
import compression from 'compression';
import { ConfigService } from '@nestjs/config';
import { TimeoutInterceptor } from 'utils/interceptors/timeout.interceptor';
import { AuditTransformInterceptor } from 'utils/common/audit/audit-transform.interceptor';
import { join } from 'path';
import * as express from 'express';
import { CleanupFilesOnErrorInterceptor } from 'utils/interceptors/cleanup-files-on-error.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  const configService = app.get(ConfigService);

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
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Cors
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
    credentials: true,
  });
  // Compression
  app.use(compression());

  // Global Pipes / Filters / Interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      exceptionFactory: (errors) => {
        const result = errors.reduce(
          (acc, error) => {
            acc[error.property] = Object.values(error.constraints ?? {});
            return acc;
          },
          {} as Record<string, string[]>,
        );
        return new BadRequestException({
          message: 'Validation failed',
          errors: result,
        });
      },
    }),
  );

  const reflector = app.get(Reflector);

  // Log every request/response and format all outgoing responses

  app.useGlobalInterceptors(
    new LoggingInterceptor(appLogger),
    new AuditTransformInterceptor(),
    new ResponseInterceptor(reflector),
    new TimeoutInterceptor(reflector, 30_000),
    new CleanupFilesOnErrorInterceptor(),
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
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  document.security = [
    {
      'access-token': [],
    },
  ];

  // Setup Swagger UI with better options
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'Nest Starter API Docs',
  });

  // Graceful Shutdown
  app.enableShutdownHooks();

  // Start
  const PORT = configService.get('PORT', '3000');
  const ENV = configService.get('NODE_ENV', 'development');

  await app.listen(PORT);

  appLogger.log(`Environment : ${ENV}`, 'Bootstrap');
  appLogger.log(`App         : http://localhost:${PORT}`, 'Bootstrap');
  appLogger.log(`Swagger     : http://localhost:${PORT}/api/docs`, 'Bootstrap');
}

bootstrap();
