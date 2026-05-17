import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsOptional } from 'class-validator';

export class ReportFilterDto {
  @ApiPropertyOptional({
    description: 'Data de início do período (ISO 8601)',
    example: '2026-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Data de fim do período (ISO 8601)',
    example: '2026-01-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Alias legado para data única (retrocompatibilidade).',
    example: '2026-01-15',
    deprecated: true,
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsDateString()
  DATA?: string;
}
