import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

function normalizeNumber(value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return value;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}

export class CreateGoalDto {
  @ApiProperty({ description: 'Título da meta', example: 'Viagem de férias' })
  @IsString()
  @MaxLength(120)
  title!: string;

  @ApiProperty({ description: 'Valor alvo da meta', example: 5000 })
  @Transform(({ value }) => normalizeNumber(value))
  @IsNumber()
  @Min(0.01)
  targetAmount!: number;

  @ApiPropertyOptional({
    description: 'Valor acumulado atualmente',
    example: 1200,
    default: 0,
  })
  @IsOptional()
  @Transform(({ value }) => normalizeNumber(value))
  @IsNumber()
  @Min(0)
  currentAmount?: number;

  @ApiProperty({
    description: 'Data limite da meta (ISO 8601)',
    example: '2026-12-31',
  })
  @IsDateString()
  dueDate!: string;
}
