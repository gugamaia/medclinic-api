import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

export class ListPatientsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  name?: string;
}
