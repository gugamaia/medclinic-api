import { Injectable } from '@nestjs/common';
import { AppError } from '../common/errors/app-error';
import { PasswordService } from '../auth/password.service';
import { JwtService } from '../auth/jwt.service';
import { UsersRepository } from './users.repository';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  // RF13 - so chega aqui quem ja passou pelo guard com @Roles('admin'),
  // entao nenhuma rota publica concede perfil.
  async register(dto: RegisterUserDto): Promise<UserResponseDto> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new AppError(
        'EMAIL_JA_CADASTRADO',
        'Este e-mail ja esta cadastrado.',
      );
    }

    const user = this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      password: await this.passwordService.hash(dto.password),
      roles: dto.roles,
    });

    const saved = await this.usersRepository.save(user);
    return this.toResponseDto(saved);
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.usersRepository.findForAuthentication(dto.email);

    // Mesma resposta para e-mail inexistente e para senha errada -
    // nao informamos qual dos dois falhou (Secao 4.9.2).
    if (!user) {
      throw new AppError('CREDENCIAIS_INVALIDAS', 'E-mail ou senha invalidos.');
    }

    const passwordMatches = await this.passwordService.compare(
      dto.password,
      user.password,
    );
    if (!passwordMatches) {
      throw new AppError('CREDENCIAIS_INVALIDAS', 'E-mail ou senha invalidos.');
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      roles: user.roles,
    });

    return { accessToken };
  }

  async me(userId: number): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOneBy({ id: userId });
    if (!user) {
      throw new AppError('RECURSO_NAO_ENCONTRADO', 'Usuario nao encontrado.');
    }
    return this.toResponseDto(user);
  }

  private toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
    };
  }
}
