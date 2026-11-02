import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  ForbiddenException,
  HttpException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { AppError } from '../errors/app-error';
import { ErrorCodeKey } from '../errors/error-code';

interface ErrorEnvelope {
  statusCode: number;
  error: ErrorCodeKey | 'ERRO_INTERNO';
  message: string;
}

/**
 * Unico lugar da aplicacao que decide o formato da resposta de erro
 * (RP03). Qualquer erro lancado em qualquer camada sobe ate aqui.
 *
 * Envelope fixo pelo contrato (Secao 4.9.1):
 *   { "statusCode": 409, "error": "HORARIO_INDISPONIVEL", "message": "..." }
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const envelope = this.toEnvelope(exception);

    if (envelope.statusCode >= 500) {
      // Logamos o erro real no servidor, mas NUNCA no corpo da resposta
      // (RNF03 - nenhuma resposta de erro contem stack trace).
      this.logger.error(exception);
    }

    response.status(envelope.statusCode).json(envelope);
  }

  private toEnvelope(exception: unknown): ErrorEnvelope {
    if (exception instanceof AppError) {
      return {
        statusCode: exception.statusCode,
        error: exception.code,
        message: exception.message,
      };
    }

    // O ValidationPipe global lanca BadRequestException quando o corpo,
    // parametro ou query nao bate com o DTO.
    if (exception instanceof BadRequestException) {
      const body = exception.getResponse();
      const message =
        typeof body === 'object' && body !== null && 'message' in body
          ? this.flattenMessage(body.message)
          : exception.message;

      return { statusCode: 400, error: 'DADOS_INVALIDOS', message };
    }

    if (exception instanceof UnauthorizedException) {
      return {
        statusCode: 401,
        error: 'NAO_AUTENTICADO',
        message: exception.message || 'Nao autenticado.',
      };
    }

    if (exception instanceof ForbiddenException) {
      return {
        statusCode: 403,
        error: 'ACESSO_NEGADO',
        message: exception.message || 'Acesso negado.',
      };
    }

    if (exception instanceof NotFoundException) {
      return {
        statusCode: 404,
        error: 'RECURSO_NAO_ENCONTRADO',
        message: exception.message || 'Recurso nao encontrado.',
      };
    }

    if (exception instanceof HttpException) {
      return {
        statusCode: exception.getStatus(),
        error: 'DADOS_INVALIDOS',
        message: exception.message,
      };
    }

    return {
      statusCode: 500,
      error: 'ERRO_INTERNO',
      message: 'Erro interno do servidor.',
    };
  }

  private flattenMessage(message: unknown): string {
    if (Array.isArray(message)) {
      return message.join('; ');
    }
    return String(message);
  }
}
