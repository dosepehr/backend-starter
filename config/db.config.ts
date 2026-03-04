import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

export const dbConfig = {
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: 'root',
  password: '',
  database: 'starter',
  entities: [
    join(__dirname, '..', 'src', '**', 'entities', '*.entity.{ts,js}'),
  ],

  synchronize: true,
} satisfies TypeOrmModuleOptions;
