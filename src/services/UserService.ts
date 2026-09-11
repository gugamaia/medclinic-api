import { UserRepository } from "../repositories/UserRepository";
import { CreateUserDTO, UserResponseDTO } from "../dtos/CreateUserDTO";
import { hashPassword } from "../utils/hash";
import { AppError } from "../utils/AppError";
import { isValidEmail } from "../utils/validators";
import { User, UserRole } from "../entities/User";

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async register(data: CreateUserDTO): Promise<UserResponseDTO> {
    const { name, email, password, role } = data;

    if (!name || !email || !password) {
      throw new AppError(
        "Os campos nome, e-mail e senha são obrigatórios.",
        400
      );
    }

    if (!isValidEmail(email)) {
      throw new AppError("Formato de e-mail inválido.", 400);
    }

    if (password.length < 6) {
      throw new AppError(
        "A senha deve possuir no mínimo 6 caracteres.",
        400
      );
    }

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError("Este e-mail já está cadastrado.", 409);
    }

    const hashedPassword = await hashPassword(password);

    const user: User = await this.userRepository.create({
      name,
      email,
      password: hashedPassword,
      role: role ?? UserRole.ATTENDANT,
    });

    return this.toResponseDTO(user);
  }

  async findById(id: string): Promise<UserResponseDTO> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new AppError("Usuário não encontrado.", 404);
    }

    return this.toResponseDTO(user);
  }

  private toResponseDTO(user: User): UserResponseDTO {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
