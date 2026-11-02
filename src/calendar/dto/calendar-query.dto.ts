import { Matches } from 'class-validator';

/**
 * RF05/4.9.6 - periodo da agenda em datas puras YYYY-MM-DD. As demais
 * regras (data existente, from <= to, maximo de 31 dias) dependem de
 * comparar os campos entre si e ficam no service.
 */
export class CalendarQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to: string;
}
