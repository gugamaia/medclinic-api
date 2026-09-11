import { Request, Response, NextFunction } from "express";
import { TokenExpiredError } from "jsonwebtoken";
import { verifyToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";

export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError("Token de autenticação não informado.", 401);
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new AppError("Formato de token inválido.", 401);
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new AppError("Token expirado. Faça login novamente.", 401);
    }
    throw new AppError("Token inválido.", 401);
  }
}
