import { Request, Response, NextFunction } from "express";
import { UserRole } from "../entities/User";
import { AppError } from "../utils/AppError";

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError("Usuário não autenticado.", 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        "Você não tem permissão para acessar este recurso.",
        403
      );
    }

    next();
  };
}
