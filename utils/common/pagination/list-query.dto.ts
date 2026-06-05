import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from './pagination.dto';

export class ListQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Sort by field. Prefix with - for descending. Example: -createdAt',
    example: '-createdAt',
  })
  @IsOptional()
  @IsString()
  ordering?: string;

  @ApiPropertyOptional({
    description: 'Search term across searchable fields',
    example: 'phone',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Include soft-deleted records in results',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  withDeleted?: boolean;
}
