import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { AuthController } from './auth.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';

@Module({
  controllers: [UsersController, AuthController],
  providers: [UsersService, UsersRepository],
  exports: [UsersRepository, UsersService],
})
export class UsersModule {}
