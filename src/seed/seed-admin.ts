import 'reflect-metadata';
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { AppDataSource } from '../common/database/cli-typeorm';
import { User } from '../users/entities/user.entity';

/**
 * RP07 - garante que sempre exista pelo menos um usuario "admin" apos o
 * deploy (sem ele ninguem conseguiria cadastrar o primeiro medico, ja
 * que criacao de medico/usuario exige @Roles('admin')). Idempotente: se
 * o e-mail de admin ja existir, nao faz nada.
 *
 * Variaveis de ambiente usadas: ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD
 * (todas com default em src/env.ts).
 */
async function seedAdmin() {
  const dataSource = await AppDataSource.initialize();

  const name = process.env.ADMIN_NAME ?? 'Administrador';
  const email = process.env.ADMIN_EMAIL ?? 'admin@medclinic.com';
  const password = process.env.ADMIN_PASSWORD ?? 'changeme';

  const userRepo = dataSource.getRepository(User);
  const existing = await userRepo.findOneBy({ email });

  if (existing) {
    console.log(`Usuario admin "${email}" ja existe - nada a fazer.`);
    await dataSource.destroy();
    return;
  }

  const hashed = await bcrypt.hash(password, await bcrypt.genSalt());
  const admin = userRepo.create({
    name,
    email,
    password: hashed,
    roles: ['admin'],
  });
  await userRepo.save(admin);

  console.log(`Usuario admin "${email}" criado com sucesso.`);
  await dataSource.destroy();
}

seedAdmin().catch((err: unknown) => {
  console.error('Falha ao criar usuario admin:', err);
  process.exit(1);
});
