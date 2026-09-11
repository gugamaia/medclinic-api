import { Request, Response } from "express";

export class AdminController {
  ping = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      message: "Pong! Acesso concedido: você é um Administrador.",
    });
  };
}
