/**
 * Catalogo oficial de codigos de erro do contrato (Secao 4.9.1 do enunciado).
 * Estes sao os UNICOS valores aceitos no campo "error" do envelope de erro.
 * Cada codigo tem um status HTTP fixo associado.
 */
export const ErrorCode = {
  DADOS_INVALIDOS: 400,
  NAO_AUTENTICADO: 401,
  CREDENCIAIS_INVALIDAS: 401,
  ACESSO_NEGADO: 403,
  RECURSO_NAO_ENCONTRADO: 404,
  EMAIL_JA_CADASTRADO: 409,
  CPF_JA_CADASTRADO: 409,
  CRM_JA_CADASTRADO: 409,
  HORARIO_INDISPONIVEL: 409,
  PACIENTE_INDISPONIVEL: 409,
  HORARIO_FORA_DA_ESCALA: 422,
  TRANSICAO_INVALIDA: 422,
} as const;

export type ErrorCodeKey = keyof typeof ErrorCode;
