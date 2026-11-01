import { ArrayMinSize, IsArray, IsEmail, IsIn, IsString, MinLength } from 'class-validator';
import { ROLE_NAMES, RoleName } from '../entities/user.entity';

export class RegisterUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(ROLE_NAMES, { each: true })
  roles: RoleName[];
}
