import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './data-source-options';
import { APIEnv } from '../../env';

/**
 * Unico lugar que conecta ao PostgreSQL. O DataSource e exportado como
 * provider global, injetado via construtor (RP02) em qualquer repository
 * ou service que precise dele.
 */
@Global()
@Module({
  providers: [
    {
      provide: DataSource,
      async useFactory(configService: ConfigService<APIEnv>) {
        // Garante que as variaveis de ambiente ja validadas pelo
        // ConfigModule tambem fiquem em process.env, para o
        // buildDataSourceOptions (compartilhado com o CLI) funcionar
        // igual nos dois contextos.
        const dataSource = new DataSource(buildDataSourceOptions());
        await dataSource.initialize();
        await dataSource.runMigrations({ transaction: 'each' });
        return dataSource;
      },
      inject: [ConfigService],
    },
  ],
  exports: [DataSource],
})
export class DatabaseModule {}
