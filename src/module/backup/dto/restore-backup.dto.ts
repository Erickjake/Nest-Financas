import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class BackupTransactionDto {
  @ApiProperty({ example: 'Salário' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  amount!: number;

  @ApiProperty({ example: 'RECEITA' })
  @IsString()
  type!: string;

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  categoryId?: number | null;
}

class BackupCategoryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  id?: number;

  @ApiProperty({ example: 'Alimentação' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Gastos com comida' })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: '#FF5733' })
  @IsOptional()
  @IsString()
  color?: string | null;

  @ApiPropertyOptional({ example: 'utensils' })
  @IsOptional()
  @IsString()
  icon?: string | null;
}

class BackupBudgetDto {
  @ApiProperty({ example: 2000 })
  @IsNumber()
  amount!: number;

  @ApiProperty({ example: 4 })
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty({ example: 2026 })
  @IsInt()
  year!: number;

  @ApiPropertyOptional({ example: 80 })
  @IsOptional()
  @IsNumber()
  alertThreshold?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  categoryId?: number | null;
}

class BackupDataDto {
  @ApiPropertyOptional({ type: [BackupTransactionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BackupTransactionDto)
  transactions?: BackupTransactionDto[];

  @ApiPropertyOptional({ type: [BackupCategoryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BackupCategoryDto)
  categories?: BackupCategoryDto[];

  @ApiPropertyOptional({ type: [BackupBudgetDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BackupBudgetDto)
  budgets?: BackupBudgetDto[];
}

export class RestoreBackupDto {
  @ApiProperty({ example: '1.0' })
  @IsString()
  version!: string;

  @ApiProperty({ type: BackupDataDto })
  @ValidateNested()
  @Type(() => BackupDataDto)
  data!: BackupDataDto;
}
