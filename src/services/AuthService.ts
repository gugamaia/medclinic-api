import { UserRepository } from "../repositories/UserRepository";
import { LoginDTO, AuthResponseDTO } from "../dtos/LoginDTO";
import { comparePassword } from "../utils/hash";
import { generateToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async login(data: LoginDTO): Promise<AuthResponseDTO> {
    const { email, password } = data;

    if (!email || !password) {
      throw new AppError("E-mail e senha são obrigatórios.", 400);
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError("Credenciais inválidas.", 401);
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new AppError("Credenciais inválidas.", 401);
    }

    const token = generateToken({ sub: user.id, role: user.role });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
