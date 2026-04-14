import { Body, Controller, Get, Post } from "@nestjs/common";
import { TransactionsService } from "./transactions.service";

// O '@Controller' define que a URL para acessar isso será algo como http://localhost:3000/transactions
@Controller("transactions")
export class TransactionsController {
  // O construtor "puxa" o nosso serviço para podermos usá-lo aqui dentro
  constructor(private readonly transactionsService: TransactionsService) {}

  // O '@Get()' indica que se o usuário acessar a URL lendo dados, este método será chamado
  @Get()
  getAllTransactions() {
    return this.transactionsService.findAll(); // Pede ao serviço a lista completa
  }

  // O '@Post()' indica que se o usuário enviar dados para a URL, este método será chamado
  @Post()
  createTransaction(
    // O '@Body()' extrai as informações que o usuário enviou no "corpo" da requisição
    @Body("title") title: string,
    @Body("amount") amount: number,
    @Body("type") type: "income" | "expense",
    @Body("userId") userId: number,
  ) {
    return this.transactionsService.create(title, amount, type, userId); // Manda o serviço criar a transação
  }
}
