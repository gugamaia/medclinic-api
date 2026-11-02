import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { Roles } from '../auth/decorator/roles.decorator';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { AuthUser } from '../auth/dto/jwt-payload';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@CurrentUser() authUser: AuthUser) {
    return this.usersService.me(authUser.id);
  }

  @Roles('admin')
  @Post()
  @HttpCode(201)
  register(@Body() dto: RegisterUserDto) {
    return this.usersService.register(dto);
  }
}
