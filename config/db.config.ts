import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';


export const dbConfig = {
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [
    join(__dirname, '..', 'src', '**', 'entities', '*.entity.{ts,js}'),
  ],

  synchronize: true,
} satisfies TypeOrmModuleOptions;
