import { Request, Response } from "express";
import { UserService } from "../services/UserService";
import { AppError } from "../utils/AppError";

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  me = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      throw new AppError("Usuário não autenticado.", 401);
    }

    const user = await this.userService.findById(req.user.id);
    res.status(200).json(user);
  };
}
