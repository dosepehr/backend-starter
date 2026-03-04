import { Module, OnModuleInit, OnApplicationBootstrap } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dbConfig } from 'config/db.config';
import { HumanModule } from './modules/human/human.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(dbConfig),
    HumanModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit, OnApplicationBootstrap {
  onModuleInit() {
    console.log('.env file has been read');
  }

  onApplicationBootstrap() {
    console.log('Database connected.');
  }
}
