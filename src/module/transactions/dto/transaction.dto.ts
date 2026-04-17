import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  MaxLength,
} from 'class-validator';

// É uma boa prática usar Enums para limitar os tipos de transação
export enum TransactionType {
  INCOME = 'INCOME', // Receita / Depósito
  EXPENSE = 'EXPENSE', // Despesa / Pagamento
  TRANSFER = 'TRANSFER', // Transferência
}

export class CreateTransactionDto {
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

  @IsEnum(TransactionType, {
    message: 'O tipo deve ser INCOME, EXPENSE ou TRANSFER',
  })
  @IsNotEmpty({ message: 'O tipo de transação é obrigatório' })
  type!: TransactionType;

  @IsString()
  @IsNotEmpty({ message: 'A descrição é obrigatória' })
  @MaxLength(255, {
    message: 'A título não pode ter mais de 255 caracteres',
  })
  title!: string;

  // Campos Opcionais abaixo

  @IsOptional()
  @IsString({ message: 'O ID da categoria deve ser um texto válido' })
  categoryId?: string;

  @IsOptional()
  @IsDateString(
    {},
    {
      message: 'A data deve estar no formato padrão ISO (ex: 2023-10-01T12:00:00Z)',
    },
  )
  date?: string;

  @IsOptional()
  @IsString({ message: 'O ID do destinatário deve ser um texto válido' })
  receiverId?: string; // Usado apenas se o type for TRANSFER
}
