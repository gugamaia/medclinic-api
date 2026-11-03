import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';

export interface AdminCredentials {
  name: string;
  email: string;
  password: string;
}

/**
 * RP07 - garante que exista o primeiro usuario "admin", com credenciais
 * vindas de variaveis de ambiente. Idempotente: se o e-mail ja existe,
 * nao faz nada. Devolve true quando criou o usuario.
 */
export async function ensureAdmin(
  dataSource: DataSource,
  credentials: AdminCredentials,
): Promise<boolean> {
  const userRepo = dataSource.getRepository(User);
  const existing = await userRepo.findOneBy({
    email: credentials.email.toLowerCase(),
  });
  if (existing) return false;

  const hashed = await bcrypt.hash(
    credentials.password,
    await bcrypt.genSalt(),
  );
  await userRepo.save(
    userRepo.create({
      name: credentials.name,
      email: credentials.email.toLowerCase(),
      password: hashed,
      roles: ['admin'],
    }),
  );
  return true;
}
