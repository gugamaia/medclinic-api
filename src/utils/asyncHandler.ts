import { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncFunction = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export function asyncHandler(fn: AsyncFunction): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
