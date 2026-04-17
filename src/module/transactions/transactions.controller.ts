import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { CreateTransactionDto } from './dto/transaction.dto';
import type { TransactionsService } from './transactions.service';

// O '@Controller' define que a URL para acessar isso será algo como http://localhost:3000/transactions
@Controller('transactions')
export class TransactionsController {
  // O construtor "puxa" o nosso serviço para podermos usá-lo aqui dentro
  constructor(private readonly transactionsService: TransactionsService) {}

  // O '@Get()' indica que se o usuário acessar a URL lendo dados, este método será chamado
  @UseGuards(AuthGuard('jwt'))
  @Get()
  getAllTransactions() {
    return this.transactionsService.findAll(); // Pede ao serviço a lista completa
  }

  // O '@Post()' indica que se o usuário enviar dados para a URL, este método será chamado
  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Body() dto: CreateTransactionDto, @Request() req) {
    const userId = Number(req.user.userId || req.user.sub);

    // A ordem deve ser IDENTICA ao que está no Service
    return this.transactionsService.create(userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.transactionsService.findOne(id);
  }
  @UseGuards(AuthGuard('jwt'))
  @Put(':id')
  update(@Param('id') id: number, @Body() dto: CreateTransactionDto) {
    return this.transactionsService.update(id, dto);
  }
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  delete(@Param('id') id: number) {
    return this.transactionsService.delete(id);
  }
}
