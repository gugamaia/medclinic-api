import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './data-source-options';

// Usado pelos scripts "npm run migration:*" (TypeORM CLI). Fora do
// processo do Nest, entao carregamos o .env manualmente com dotenv.
export const AppDataSource = new DataSource(buildDataSourceOptions());
