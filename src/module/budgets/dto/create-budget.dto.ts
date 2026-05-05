import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

function normalizeNumber(value: unknown): unknown {
  if (value === undefined || value === null || value === '') {
    return value;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}

function normalizeMonth(value: unknown, dueDate: unknown): unknown {
  if (value !== undefined && value !== null && value !== '') {
    return normalizeNumber(value);
  }

  if (typeof dueDate !== 'string' || dueDate.trim() === '') {
    return value;
  }

  const date = new Date(dueDate);
  return Number.isNaN(date.getTime()) ? value : date.getMonth() + 1;
}

function normalizeYear(value: unknown, dueDate: unknown): unknown {
  if (value !== undefined && value !== null && value !== '') {
    return normalizeNumber(value);
  }

  if (typeof dueDate !== 'string' || dueDate.trim() === '') {
    return value;
  }

  const date = new Date(dueDate);
  return Number.isNaN(date.getTime()) ? value : date.getFullYear();
}

export class CreateBudgetDto {
  @ApiProperty({ description: 'Valor limite do orçamento', example: 2000 })
  @Transform(({ value, obj }) => normalizeNumber(value ?? obj.targetAmount ?? obj.currentAmount))
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: 'Mês (1-12)', example: 4 })
  @Transform(({ value, obj }) => normalizeMonth(value, obj.dueDate))
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty({ description: 'Ano', example: 2026 })
  @Transform(({ value, obj }) => normalizeYear(value, obj.dueDate))
  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;

  @ApiPropertyOptional({
    description: 'Percentual para alerta (0-100). Padrão: 80',
    example: 80,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  alertThreshold?: number;

  @ApiPropertyOptional({ description: 'ID da categoria (opcional)', example: 1 })
  @IsOptional()
  @Transform(({ value }) => normalizeNumber(value))
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({
    description: '(Legado) Campo ignorado para compatibilidade com clientes antigos.',
    deprecated: true,
    example: 'Orcamento da casa',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: '(Legado) Alias de amount.',
    deprecated: true,
    example: 1200,
  })
  @IsOptional()
  targetAmount?: unknown;

  @ApiPropertyOptional({
    description: '(Legado) Alias alternativo de amount.',
    deprecated: true,
    example: 1200,
  })
  @IsOptional()
  currentAmount?: unknown;

  @ApiPropertyOptional({
    description: '(Legado) Data usada para derivar month/year quando ausentes.',
    deprecated: true,
    example: '2026-04-21',
  })
  @IsOptional()
  @IsString()
  dueDate?: string;
}
