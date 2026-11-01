import { RoleName } from '../entities/user.entity';

export class UserResponseDto {
  id: number;
  name: string;
  email: string;
  roles: RoleName[];
}
