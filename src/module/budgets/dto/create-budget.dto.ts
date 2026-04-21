import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class CreateBudgetDto {
  @ApiProperty({ description: 'Valor limite do orçamento', example: 2000 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: 'Mês (1-12)', example: 4 })
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty({ description: 'Ano', example: 2026 })
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
  @IsInt()
  categoryId?: number;
}
