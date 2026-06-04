import {
  MiddlewareConsumer,
  Module,
  NestModule,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dbConfig } from 'config/db.config';
import { loggerConfig } from 'config/logger.config';
import { WinstonModule } from 'nest-winston';
import { LoggerModule } from 'utils/common/logger/logger.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { throttlerConfig } from 'config/throttler.config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { HealthModule } from 'utils/common/health/health.module';
import { validateEnv } from 'utils/env/env.dto';
import { RequestIdMiddleware } from 'utils/middlewares/request-id.middleware';
import { AppLogger } from 'utils/common/logger/logger.service';
import { CacheModule } from 'utils/cache/cache.module';
import { DataSource } from 'typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AuditSubscriber } from 'utils/common/audit/audit.subscriber';
import { AuthGuard } from 'utils/guards/auth.guard';
import { RolesGuard } from 'utils/guards/roles.guard';
import { AuditInterceptor } from 'utils/common/audit/audit.interceptor';
import { FileModule } from './modules/file/file.module';
import { QueryModule } from 'utils/common/query/query.module';
import { AdminModule } from './admin/admin.module';
import { AppThrottlerGuard } from 'utils/guards/throttler.guard';

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
    HealthModule,
    CacheModule,
    QueryModule,
    AdminModule,
    UsersModule,
    AuthModule,
    FileModule,
  ],
  providers: [
    AuditSubscriber,
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule implements NestModule, OnApplicationShutdown {
  constructor(
    private readonly logger: AppLogger,
    private readonly dataSource: DataSource,
  ) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*path');
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(
      `Received signal: ${signal ?? 'unknown'} — shutting down gracefully`,
      'Shutdown',
    );
    try {
      if (this.dataSource.isInitialized) {
        await this.dataSource.destroy();
        this.logger.log('Database connection closed', 'Shutdown');
      }
    } catch (err) {
      this.logger.error('Failed to close Database connection', err, 'Shutdown');
    }
  }
}
