import { Injectable } from '@nestjs/common';
import { compare, genSalt, hash } from 'bcrypt';

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    return hash(password, await genSalt());
  }

  async compare(password: string, hashed: string): Promise<boolean> {
    return compare(password, hashed);
  }
}
