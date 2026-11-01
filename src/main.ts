import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { APIEnv } from './env';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService: ConfigService<APIEnv> = app.get(ConfigService);
  const port = configService.getOrThrow<number>('PORT');

  // RF01/Secao 4.9.1 - toda rota vive sob /api/v1.
  app.setGlobalPrefix('api/v1');

  // RF12 - valida corpo/parametro/query antes de chegar na regra de
  // negocio; whitelist remove campos nao declarados no DTO.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // RP03/RF11 - unico ponto que decide o formato de resposta de erro.
  app.useGlobalFilters(new AllExceptionsFilter());

  // RP10 - escuta em 0.0.0.0, nao em localhost, para aceitar trafego
  // externo quando publicada na nuvem.
  await app.listen(port, '0.0.0.0');
  console.log(`MedClinic API rodando na porta ${port}`);
}

bootstrap().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
