import { ErrorCode, ErrorCodeKey } from './error-code';

/**
 * Erro de dominio. E lancado em qualquer camada (service, guard, etc) e
 * capturado SOMENTE pelo filtro global de excecoes (AllExceptionsFilter),
 * que o traduz para o envelope HTTP. A regra de negocio nunca conhece
 * codigo de status (RP03) - ela so sabe qual codigo de erro semantico
 * aconteceu.
 */
export class AppError extends Error {
  public readonly code: ErrorCodeKey;
  public readonly statusCode: number;

  constructor(code: ErrorCodeKey, message: string) {
    super(message);
    this.code = code;
    this.statusCode = ErrorCode[code];
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
