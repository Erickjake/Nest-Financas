import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

// É uma boa prática usar Enums para limitar os tipos de transação
export enum TransactionType {
  INCOME = 'INCOME', // Receita / Depósito
  EXPENSE = 'EXPENSE', // Despesa / Pagamento
  TRANSFER = 'TRANSFER', // Transferência
}

export class CreateTransactionDto {
  @ApiProperty({
    description: 'O valor da transação',
    example: 100.0,
  })

  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message: 'O valor deve ser um número válido com no máximo 2 casas decimais',
    },
  )
  @IsPositive({
    message: 'O valor da transação deve ser estritamente positivo',
  })
  @IsNotEmpty({ message: 'O valor é obrigatório' })
  amount!: number;

  @ApiProperty({
    description: 'O tipo de transação',
    example: TransactionType.INCOME,
  })
  @IsEnum(TransactionType, {
    message: 'O tipo deve ser INCOME, EXPENSE ou TRANSFER',
  })
  @IsNotEmpty({ message: 'O tipo de transação é obrigatório' })
  type!: TransactionType;

  @ApiProperty({
    description: 'A descrição da transação',
    example: 'Receita de salário',
  })
  @IsString()
  @IsNotEmpty({ message: 'A descrição é obrigatória' })
  @MaxLength(255, {
    message: 'A título não pode ter mais de 255 caracteres',
  })
  title!: string;

  // Campos Opcionais abaixo
  @ApiProperty({
    description: 'O ID da categoria associada à transação',
    example: '123456',
  })
  @IsOptional()
  @IsString({ message: 'O ID da categoria deve ser um texto válido' })
  categoryId?: string;

  @ApiProperty({
    description: 'A data da transação',
    example: '2023-10-01T12:00:00Z',
  })
  @IsDateString(
    {},
    {
      message: 'A data deve estar no formato padrão ISO (ex: 2023-10-01T12:00:00Z)',
    },
  )
  date?: string;

  @ApiProperty({
    description: 'O ID do destinatário para transferências',
    example: '789012',
  })
  @IsOptional()
  @IsString({ message: 'O ID do destinatário deve ser um texto válido' })
  receiverId?: string; // Usado apenas se o type for TRANSFER
}
