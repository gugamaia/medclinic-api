import 'reflect-metadata';
import 'dotenv/config';
import { AppDataSource } from '../common/database/cli-typeorm';
import { ensureAdmin } from './ensure-admin';

/**
 * Script manual (npm run seed:admin). A API tambem executa o mesmo seed
 * ao iniciar (ver main.ts), entao em producao nao e preciso rodar este.
 */
async function seedAdmin() {
  const dataSource = await AppDataSource.initialize();
  const email = process.env.ADMIN_EMAIL ?? 'admin@medclinic.com';
  const created = await ensureAdmin(dataSource, {
    name: process.env.ADMIN_NAME ?? 'Administrador',
    email,
    password: process.env.ADMIN_PASSWORD ?? 'changeme',
  });
  console.log(
    created
      ? `Usuario admin "${email}" criado com sucesso.`
      : `Usuario admin "${email}" ja existe - nada a fazer.`,
  );
  await dataSource.destroy();
}

seedAdmin().catch((err: unknown) => {
  console.error('Falha ao criar usuario admin:', err);
  process.exit(1);
});
