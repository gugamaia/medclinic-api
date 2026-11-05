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

    const databaseError = this.fromDatabaseError(exception);
    if (databaseError) {
      return databaseError;
    }

    return {
      statusCode: 500,
      error: 'ERRO_INTERNO',
      message: 'Erro interno do servidor.',
    };
  }

  /**
   * Erros do Postgres que a validacao de entrada nao pega antes da
   * consulta (ids fora do int4, texto invalido, violacao de unique em
   * corrida). Sao erro do cliente, nao do servidor: nunca viram 500.
   */
  private fromDatabaseError(exception: unknown): ErrorEnvelope | null {
    const dbError = exception as { code?: unknown; detail?: unknown };
    if (typeof dbError?.code !== 'string') {
      return null;
    }
    const detail = typeof dbError.detail === 'string' ? dbError.detail : '';

    switch (dbError.code) {
      case '22003': // numeric_value_out_of_range: id maior que o int4
        return this.fromAppError(
          new AppError('RECURSO_NAO_ENCONTRADO', 'Recurso nao encontrado.'),
        );
      case '22P02': // invalid_text_representation
      case '22007': // invalid_datetime_format
      case '22008': // datetime_field_overflow
        return this.fromAppError(
          new AppError('DADOS_INVALIDOS', 'Dados de entrada invalidos.'),
        );
      case '23503': // foreign_key_violation: referencia inexistente
        return this.fromAppError(
          new AppError(
            'RECURSO_NAO_ENCONTRADO',
            'Recurso relacionado nao encontrado.',
          ),
        );
      case '23505': // unique_violation
        if (detail.includes('cpf')) {
          return this.fromAppError(
            new AppError('CPF_JA_CADASTRADO', 'Este CPF ja esta cadastrado.'),
          );
        }
        if (detail.includes('crm')) {
          return this.fromAppError(
            new AppError('CRM_JA_CADASTRADO', 'Este CRM ja esta cadastrado.'),
          );
        }
        if (detail.includes('email')) {
          return this.fromAppError(
            new AppError(
              'EMAIL_JA_CADASTRADO',
              'Este e-mail ja esta cadastrado.',
            ),
          );
        }
        return null;
      default:
        return null;
    }
  }

  private fromAppError(error: AppError): ErrorEnvelope {
    return {
      statusCode: error.statusCode,
      error: error.code,
      message: error.message,
    };
  }

  private flattenMessage(message: unknown): string {
    if (Array.isArray(message)) {
      return message.join('; ');
    }
    return String(message);
  }
}
