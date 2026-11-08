import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import {
  MAX_PAGE,
  PaginationQueryDto,
} from '../../src/common/pagination/pagination-query.dto';

function errorsFor(input: Record<string, string>): number {
  return validateSync(plainToInstance(PaginationQueryDto, input)).length;
}

describe('PaginationQueryDto (RNF de paginacao)', () => {
  it('usa page=1 e pageSize=20 por padrao', () => {
    expect(errorsFor({})).toBe(0);
    const dto = plainToInstance(PaginationQueryDto, {});
    expect([dto.page, dto.pageSize]).toEqual([1, 20]);
  });

  it('aceita o limite superior de pagina', () => {
    expect(errorsFor({ page: String(MAX_PAGE) })).toBe(0);
  });

  it.each([
    { page: '0' },
    { page: String(MAX_PAGE + 1) },
    { page: '99999999999' },
    { pageSize: '101' },
    { pageSize: '0' },
    { page: 'abc' },
  ])('rejeita %j', (input) => {
    expect(errorsFor(input)).toBeGreaterThan(0);
  });
});
