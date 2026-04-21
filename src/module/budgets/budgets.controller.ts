import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@ApiTags('budgets')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @ApiOperation({
    summary: 'Criar orçamento mensal',
    description: 'Cria um orçamento para um mês/ano, opcionalmente vinculado a uma categoria.',
  })
  @ApiResponse({ status: 201, description: 'Orçamento criado com sucesso.' })
  @ApiResponse({ status: 409, description: 'Já existe um orçamento para este mês/ano/categoria.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  create(@Body() dto: CreateBudgetDto, @Request() req) {
    return this.budgetsService.create(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar orçamentos',
    description: 'Retorna todos os orçamentos do usuário autenticado.',
  })
  @ApiResponse({ status: 200, description: 'Lista de orçamentos retornada.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  findAll(@Request() req) {
    return this.budgetsService.findAll(req.user.userId);
  }

  @Get('status')
  @ApiOperation({
    summary: 'Status dos orçamentos (alertas)',
    description:
      'Retorna o status de cada orçamento para o mês/ano informado, comparando gastos reais vs limite, com indicadores de alerta.',
  })
  @ApiQuery({ name: 'month', type: Number, example: 4, description: 'Mês (1-12)' })
  @ApiQuery({ name: 'year', type: Number, example: 2026, description: 'Ano' })
  @ApiResponse({
    status: 200,
    description: 'Status retornado com sucesso.',
    schema: {
      example: [
        {
          id: 1,
          amount: 2000,
          month: 4,
          year: 2026,
          alertThreshold: 80,
          categoryName: 'Alimentação',
          spent: 1700,
          remaining: 300,
          percentage: 85,
          isOverBudget: false,
          isAlert: true,
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  getStatus(
    @Query('month', ParseIntPipe) month: number,
    @Query('year', ParseIntPipe) year: number,
    @Request() req,
  ) {
    return this.budgetsService.getStatus(req.user.userId, month, year);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar orçamento por ID' })
  @ApiResponse({ status: 200, description: 'Orçamento retornado.' })
  @ApiResponse({ status: 404, description: 'Orçamento não encontrado.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.budgetsService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar orçamento' })
  @ApiResponse({ status: 200, description: 'Orçamento atualizado.' })
  @ApiResponse({ status: 404, description: 'Orçamento não encontrado.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBudgetDto, @Request() req) {
    return this.budgetsService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover orçamento (soft delete)' })
  @ApiResponse({ status: 200, description: 'Orçamento removido.' })
  @ApiResponse({ status: 404, description: 'Orçamento não encontrado.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.budgetsService.remove(id, req.user.userId);
  }
}
