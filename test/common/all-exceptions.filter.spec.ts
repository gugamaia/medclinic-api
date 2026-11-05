import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../../src/common/errors/app-error';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';

interface Body {
  statusCode: number;
  error: string;
  message: string;
}

function run(exception: unknown): { status: number; body: Body } {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return {
    status: status.mock.calls[0][0] as number,
    body: json.mock.calls[0][0] as Body,
  };
}

describe('AllExceptionsFilter (RP03/RF11/RNF03)', () => {
  it('converte AppError no envelope do contrato', () => {
    const { status, body } = run(
      new AppError('HORARIO_INDISPONIVEL', 'ocupado'),
    );
    expect(status).toBe(409);
    expect(body).toEqual({
      statusCode: 409,
      error: 'HORARIO_INDISPONIVEL',
      message: 'ocupado',
    });
  });

  it('erros de validacao viram 400 DADOS_INVALIDOS', () => {
    const { status, body } = run(new BadRequestException(['a', 'b']));
    expect(status).toBe(400);
    expect(body.error).toBe('DADOS_INVALIDOS');
    expect(body.message).toBe('a; b');
  });

  it('id fora do int4 (22003) vira 404 em vez de 500', () => {
    const { status, body } = run({ code: '22003' });
    expect(status).toBe(404);
    expect(body.error).toBe('RECURSO_NAO_ENCONTRADO');
  });

  it.each(['22P02', '22007', '22008'])(
    '%s vira 400 DADOS_INVALIDOS',
    (code) => {
      const { status, body } = run({ code });
      expect(status).toBe(400);
      expect(body.error).toBe('DADOS_INVALIDOS');
    },
  );

  it('violacao de FK (23503) vira 404', () => {
    expect(run({ code: '23503' }).status).toBe(404);
  });

  it.each([
    ['Key (cpf)=(1) already exists.', 'CPF_JA_CADASTRADO'],
    ['Key (crm)=(1) already exists.', 'CRM_JA_CADASTRADO'],
    ['Key (email)=(a) already exists.', 'EMAIL_JA_CADASTRADO'],
  ])('unique (%s) vira 409 %s', (detail, error) => {
    const { status, body } = run({ code: '23505', detail });
    expect(status).toBe(409);
    expect(body.error).toBe(error);
  });

  it('erro desconhecido vira 500 sem vazar detalhes', () => {
    const { status, body } = run(new Error('segredo interno'));
    expect(status).toBe(500);
    expect(body).toEqual({
      statusCode: 500,
      error: 'ERRO_INTERNO',
      message: 'Erro interno do servidor.',
    });
  });
});
