import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsString,
  validateSync,
} from 'class-validator';

const LOG_LEVELS = ['log', 'error', 'warn', 'debug', 'verbose'] as const;

export class APIEnv {
  @Type(() => Number)
  @IsNumber()
  PORT!: number;

  @IsIn(LOG_LEVELS)
  LOG_LEVEL: string = 'log';

  @IsString()
  DB_HOST!: string;

  @Type(() => Number)
  @IsNumber()
  DB_PORT = 5432;

  @IsString()
  DB_USER!: string;

  @IsString()
  DB_PASSWORD!: string;

  @IsString()
  DB_NAME!: string;

  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  DB_SYNCHRONIZE = false;

  @IsString()
  DB_LOG_LEVEL = 'error';

  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  DB_SSL = false;

  @IsString()
  JWT_SECRET!: string;

  @IsString()
  JWT_EXPIRES_IN = '8h';

  @IsString()
  JWT_ISSUER = 'medclinic';

  @IsString()
  ADMIN_NAME = 'Administrador';

  @IsString()
  ADMIN_EMAIL = 'admin@medclinic.com';

  @IsString()
  ADMIN_PASSWORD = 'changeme';
}

export function validateEnv(config: Record<string, unknown>): APIEnv {
  const apiEnv = plainToInstance(APIEnv, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(apiEnv, { whitelist: true });

  if (errors.length > 0) {
    throw new Error(
      `Variaveis de ambiente invalidas: ${JSON.stringify(errors)}`,
    );
  }

  return apiEnv;
}
