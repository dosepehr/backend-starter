import { MiddlewareConsumer, Module, NestModule, OnApplicationShutdown } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dbConfig } from 'config/db.config';
import { HumanModule } from './modules/human/human.module';
import { AnimalModule } from './modules/animal/animal.module';
import { loggerConfig } from 'config/logger.config';
import { WinstonModule } from 'nest-winston';
import { LoggerModule } from 'utils/common/logger/logger.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { throttlerConfig } from 'config/throttler.config';
import { APP_GUARD } from '@nestjs/core';
import { HealthModule } from 'utils/common/health/health.module';
import { validateEnv } from 'utils/env/env.dto';
import { RequestIdMiddleware } from 'utils/middlewares/request-id.middleware';
import { AppLogger } from 'utils/common/logger/logger.service';
import { CacheModule } from 'utils/cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    WinstonModule.forRoot(loggerConfig),
    LoggerModule,
    ThrottlerModule.forRoot(throttlerConfig),
    TypeOrmModule.forRootAsync(dbConfig),
    HumanModule,
    AnimalModule,
    HealthModule,
    CacheModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule, OnApplicationShutdown {
  constructor(private readonly logger: AppLogger) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*path');
  }

  onApplicationShutdown(signal?: string) {
    this.logger.log(
      `Received signal: ${signal ?? 'unknown'} — shutting down gracefully`,
      'Shutdown',
    );
  }
}
