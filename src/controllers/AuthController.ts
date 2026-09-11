import { Request, Response } from "express";
import { UserService } from "../services/UserService";
import { AuthService } from "../services/AuthService";
import { CreateUserDTO } from "../dtos/CreateUserDTO";
import { LoginDTO } from "../dtos/LoginDTO";

export class AuthController {
  private userService: UserService;
  private authService: AuthService;

  constructor() {
    this.userService = new UserService();
    this.authService = new AuthService();
  }

  register = async (req: Request, res: Response): Promise<void> => {
    const data: CreateUserDTO = req.body;
    const user = await this.userService.register(data);
    res.status(201).json(user);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const data: LoginDTO = req.body;
    const result = await this.authService.login(data);
    res.status(200).json(result);
  };
}
