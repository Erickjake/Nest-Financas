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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { OwnershipGuard } from '../../common/guards/ownership.guard';
import { CreateTransactionDto } from './dto/transaction.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('transactions')
@ApiBearerAuth('access_token')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Listar transações paginadas',
    description: 'Retorna todas as transações do usuário autenticado com paginação.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de transações retornada com sucesso.',
    schema: {
      example: {
        data: [
          {
            id: 1,
            description: 'Salário',
            amount: 5000,
            type: 'INCOME',
            date: '2026-04-01',
            categoryId: 1,
            userId: 1,
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          total: 47,
          totalPages: 5,
          hasNextPage: true,
          hasPreviousPage: false,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado — token JWT ausente ou inválido.' })
  @Get()
  getAllTransactions(@Request() req, @Query() pagination: PaginationDto) {
    const userId = Number(req.user.userId || req.user.sub);
    return this.transactionsService.findAllByUserPaginated(userId, pagination);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Criar uma nova transação',
    description: 'Cria uma transação financeira vinculada ao usuário autenticado.',
  })
  @ApiResponse({
    status: 201,
    description: 'Transação criada com sucesso.',
    schema: {
      example: {
        id: 1,
        description: 'Salário',
        amount: 5000,
        type: 'INCOME',
        date: '2026-04-01T00:00:00.000Z',
        categoryId: 1,
        userId: 1,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos (campo obrigatório ausente ou formato incorreto).',
  })
  @ApiResponse({ status: 401, description: 'Não autenticado — token JWT ausente ou inválido.' })
  @Post()
  async create(@Body() dto: CreateTransactionDto, @Request() req) {
    const userId = Number(req.user.userId || req.user.sub);
    return this.transactionsService.create(userId, dto);
  }

  @UseGuards(AuthGuard('jwt'), OwnershipGuard)
  @ApiOperation({
    summary: 'Buscar transação por ID',
    description: 'Retorna uma transação específica. O usuário deve ser o dono da transação.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transação encontrada.',
    schema: {
      example: {
        id: 1,
        description: 'Salário',
        amount: 5000,
        type: 'INCOME',
        date: '2026-04-01T00:00:00.000Z',
        categoryId: 1,
        userId: 1,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado — token JWT ausente ou inválido.' })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão — a transação pertence a outro usuário.',
  })
  @ApiResponse({ status: 404, description: 'Transação não encontrada.' })
  @Get(':id')
  async findOne(@Param('id') id: number, @Request() req) {
    const userId = Number(req.user.userId || req.user.sub);
    const transaction = await this.transactionsService.findOne(id);

    if (!transaction || transaction.userId !== userId) {
      throw new ForbiddenException('Você não tem permissão para acessar esta transação');
    }

    return transaction;
  }

  @UseGuards(AuthGuard('jwt'), OwnershipGuard)
  @ApiOperation({
    summary: 'Atualizar transação por ID',
    description: 'Atualiza os dados de uma transação existente. O usuário deve ser o dono.',
  })
  @ApiResponse({ status: 200, description: 'Transação atualizada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 401, description: 'Não autenticado — token JWT ausente ou inválido.' })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão — a transação pertence a outro usuário.',
  })
  @ApiResponse({ status: 404, description: 'Transação não encontrada.' })
  @Put(':id')
  async update(@Param('id') id: number, @Body() dto: CreateTransactionDto, @Request() req) {
    const userId = Number(req.user.userId || req.user.sub);
    const transaction = await this.transactionsService.findOne(id);

    if (!transaction || transaction.userId !== userId) {
      throw new ForbiddenException('Você não tem permissão para modificar esta transação');
    }

    return this.transactionsService.update(id, dto);
  }

  @UseGuards(AuthGuard('jwt'), OwnershipGuard)
  @ApiOperation({
    summary: 'Deletar transação por ID',
    description: 'Remove uma transação (soft delete). O usuário deve ser o dono.',
  })
  @ApiResponse({ status: 200, description: 'Transação deletada com sucesso.' })
  @ApiResponse({ status: 401, description: 'Não autenticado — token JWT ausente ou inválido.' })
  @ApiResponse({
    status: 403,
    description: 'Sem permissão — a transação pertence a outro usuário.',
  })
  @ApiResponse({ status: 404, description: 'Transação não encontrada.' })
  @Delete(':id')
  async delete(@Param('id') id: number, @Request() req) {
    const userId = Number(req.user.userId || req.user.sub);
    const transaction = await this.transactionsService.findOne(id);

    if (!transaction || transaction.userId !== userId) {
      throw new ForbiddenException('Você não tem permissão para deletar esta transação');
    }

    return this.transactionsService.delete(id);
  }
}
