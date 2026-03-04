import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // global port
  const PORT = process.env.PORT ?? 3000;
  console.log(`app is running on port ${PORT}`);
  await app.listen(PORT);
}
bootstrap();
