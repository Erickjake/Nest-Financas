import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { TransactionsService } from "./transactions.service";
import { CreateTransactionDto } from "./dto/transaction.dto";
import { AuthGuard } from "@nestjs/passport";

// O '@Controller' define que a URL para acessar isso será algo como http://localhost:3000/transactions
@Controller("transactions")
export class TransactionsController {
  // O construtor "puxa" o nosso serviço para podermos usá-lo aqui dentro
  constructor(private readonly transactionsService: TransactionsService) {}

  // O '@Get()' indica que se o usuário acessar a URL lendo dados, este método será chamado
  @UseGuards(AuthGuard("jwt"))
  @Get()
  getAllTransactions() {
    return this.transactionsService.findAll(); // Pede ao serviço a lista completa
  }

  // O '@Post()' indica que se o usuário enviar dados para a URL, este método será chamado
  @UseGuards(AuthGuard("jwt"))
  @Post()
  async create(@Body() dto: CreateTransactionDto, @Request() req) {
    const userId = Number(req.user.userId || req.user.sub);

    // A ordem deve ser IDENTICA ao que está no Service
    return this.transactionsService.create(userId, dto);
  }
}
