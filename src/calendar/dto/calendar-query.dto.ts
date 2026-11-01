import { IsISO8601 } from 'class-validator';

/**
 * RF05/4.9.6 - intervalo de consulta da agenda. "from"/"to" sao datas
 * (YYYY-MM-DD) ou timestamps ISO-8601; a validacao de formato e feita
 * aqui, e o restante das regras (from <= to, intervalo maximo de 31
 * dias) fica no service, pois dependem de comparar os dois campos entre
 * si - algo que class-validator sozinho nao expressa bem.
 */
export class CalendarQueryDto {
  @IsISO8601()
  from: string;

  @IsISO8601()
  to: string;
}
