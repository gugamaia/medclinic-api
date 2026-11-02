import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './data-source-options';

// Usado pelos scripts "npm run migration:*" (TypeORM CLI). Fora do
// processo do Nest, entao carregamos o .env manualmente com dotenv.
export const AppDataSource = new DataSource(buildDataSourceOptions());

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres', // Evitar process.env.USERNAME!
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  // ...
});
