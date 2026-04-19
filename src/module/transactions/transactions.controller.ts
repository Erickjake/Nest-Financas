import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { PaginationDto } from "../../common/dto/pagination.dto";
import { OwnershipGuard } from "../../common/guards/ownership.guard";
import type { CreateTransactionDto } from "./dto/transaction.dto";
import { TransactionsService } from "./transactions.service";

// O '@Controller' define que a URL para acessar isso será algo como http://localhost:3000/transactions
@Controller("transactions")
export class TransactionsController {
  // O construtor "puxa" o nosso serviço para podermos usá-lo aqui dentro
  constructor(private readonly transactionsService: TransactionsService) {}

  // O '@Get()' indica que se o usuário acessar a URL lendo dados, este método será chamado
  @UseGuards(AuthGuard("jwt"))
  @Get()
  getAllTransactions(@Request() req, @Query() pagination: PaginationDto) {
    // Retorna transações do usuário autenticado COM PAGINAÇÃO
    const userId = Number(req.user.userId || req.user.sub);
    return this.transactionsService.findAllByUserPaginated(userId, pagination);
  }

  // O '@Post()' indica que se o usuário enviar dados para a URL, este método será chamado
  @UseGuards(AuthGuard("jwt"))
  @Post()
  async create(@Body() dto: CreateTransactionDto, @Request() req) {
    const userId = Number(req.user.userId || req.user.sub);

    // A ordem deve ser IDENTICA ao que está no Service
    return this.transactionsService.create(userId, dto);
  }

  @UseGuards(AuthGuard("jwt"), OwnershipGuard)
  @Get(":id")
  async findOne(@Param("id") id: number, @Request() req) {
    const userId = Number(req.user.userId || req.user.sub);
    const transaction = await this.transactionsService.findOne(id);

    // Validação de propriedade
    if (transaction?.userId || transaction?.userId !== userId) {
      throw new ForbiddenException(
        "Você não tem permissão para acessar esta transação",
      );
    }

    return transaction;
  }

  @UseGuards(AuthGuard("jwt"), OwnershipGuard)
  @Put(":id")
  async update(
    @Param("id") id: number,
    @Body() dto: CreateTransactionDto,
    @Request() req,
  ) {
    const userId = Number(req.user.userId || req.user.sub);
    const transaction = await this.transactionsService.findOne(id);

    // Validação de propriedade
    if (transaction?.userId || transaction?.userId !== userId) {
      throw new ForbiddenException(
        "Você não tem permissão para modificar esta transação",
      );
    }

    return this.transactionsService.update(id, dto);
  }

  @UseGuards(AuthGuard("jwt"), OwnershipGuard)
  @Delete(":id")
  async delete(@Param("id") id: number, @Request() req) {
    const userId = Number(req.user.userId || req.user.sub);
    const transaction = await this.transactionsService.findOne(id);

    // Validação de propriedade
    if (transaction?.userId || transaction?.userId !== userId) {
      throw new ForbiddenException(
        "Você não tem permissão para deletar esta transação",
      );
    }

    return this.transactionsService.delete(id);
  }
}
