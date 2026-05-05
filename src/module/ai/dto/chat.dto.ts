import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

export class MessageDto {
  @ApiProperty({
    example: 'user',
    description: 'Papel do remetente da mensagem',
    enum: ['user', 'assistant'],
  })
  @IsEnum(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @ApiProperty({
    example: 'Quanto eu gastei com Alimentação este mês?',
    description: 'Conteúdo da mensagem',
  })
  @IsString()
  @IsNotEmpty()
  content!: string;
}

export class ChatDto {
  @ApiProperty({
    description: 'Histórico de mensagens da conversa. A última mensagem deve ser do usuário.',
    type: [MessageDto],
    example: [
      { role: 'user', content: 'Quanto eu gastei com Alimentação este mês?' },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages!: MessageDto[];
}
