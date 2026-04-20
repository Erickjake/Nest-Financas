import { ApiProperty } from '@nestjs/swagger';
import { IsHexColor, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Nome da categoria',
    example: 'Alimentação',
  })
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @MaxLength(50, { message: 'Nome deve ter no máximo 50 caracteres' })
  name!: string;

  @ApiProperty({
    description: 'Descrição da categoria',
    example: 'Gastos relacionados à alimentação, como supermercado e restaurantes.',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'A descrição da categoria deve ser uma string' })
  @MaxLength(255, { message: 'A descrição da categoria deve ter no máximo 255 caracteres' })
  description?: string;

  @ApiProperty({
    description: 'Cor da categoria',
    example: '#FF5733',
    required: false,
  })

  @IsOptional()
  @IsHexColor({ message: 'A cor deve ser um código hexadecimal válido, ex: #FF5733' })
  color?: string;

  @ApiProperty({
    description: 'Ícone da categoria (opcional, máximo 10 caracteres)',
    example: '🍔',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'O ícone da categoria deve ser uma string' })
  @MaxLength(10, { message: 'O ícone da categoria deve ter no máximo 10 caracteres' })
  icon?: string;
}
