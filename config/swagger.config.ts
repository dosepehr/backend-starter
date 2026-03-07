import { DocumentBuilder } from '@nestjs/swagger';
export const swaggerConfig = new DocumentBuilder()
  .setTitle('Nest Starter')
  .setDescription('Api of a simple Nest Starter')
  .setVersion('1.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'Authorization',
      description: 'Enter your JWT access token',
      in: 'header',
    },
    'access-token',
  )
  .build();
