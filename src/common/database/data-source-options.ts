import { DataSourceOptions } from 'typeorm';
import type { LoggerOptions } from 'typeorm/logger/LoggerOptions';
import { ENTITIES } from './entities';
import { SnakeCaseNamingStrategy } from './snake-case-naming-strategy';

/**
 * Opcoes de conexao compartilhadas entre a aplicacao (via
 * DatabaseModule) e o CLI de migrations (cli-typeorm.ts). Le direto de
 * process.env porque o CLI roda fora do ciclo de vida do Nest/ConfigModule.
 *
 * RP06 - synchronize e sempre false aqui; a estrutura do banco e criada
 * só por migration.
 */
function parseLogging(value: string | undefined): LoggerOptions {
  if (!value || value === 'false') return false;
  if (value === 'all' || value === 'true') return 'all';
  return value.split(',').map((v) => v.trim()) as LoggerOptions;
}

export function buildDataSourceOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true',
    synchronize: false,
    // DB_LOG_LEVEL aceita "all", "false"/vazio (desliga) ou uma lista de
    // niveis separada por virgula (ex.: "error,warn"); o default e so
    // logar erros, para nao poluir o log em producao.
    logging: parseLogging(process.env.DB_LOG_LEVEL),
    entities: ENTITIES,
    namingStrategy: new SnakeCaseNamingStrategy(),
    migrations: [__dirname + '/migrations/*{.js,.ts}'],
  };
}
