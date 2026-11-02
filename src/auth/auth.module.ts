import { Global, Module } from '@nestjs/common';
import { JwtService } from './jwt.service';
import { PasswordService } from './password.service';

@Global()
@Module({
  providers: [PasswordService, JwtService],
  exports: [PasswordService, JwtService],
})
export class AuthModule {}
