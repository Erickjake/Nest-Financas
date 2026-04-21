import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReportFilterDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Obter resumo financeiro',
    description:
      'Retorna um resumo financeiro do usuário, incluindo totais de receitas, despesas e saldo.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumo retornado com sucesso.',
    schema: { example: { totalIncome: 8000, totalExpense: 3500, balance: 4500 } },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado — token JWT ausente ou inválido.' })
  @Get('summary')
  async getSummary(@Query() filter: ReportFilterDto, @Request() req) {
    const userId = req.user.userId;
    return await this.reportsService.getSummary(userId, filter);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Obter despesas por categoria',
    description: 'Retorna o total gasto agrupado por categoria.',
  })
  @ApiResponse({
    status: 200,
    description: 'Relatório por categoria retornado com sucesso.',
    schema: { example: [{ categoryId: 1, categoryName: 'Alimentação', total: 1200 }] },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado — token JWT ausente ou inválido.' })
  @Get('by-category')
  async getByCategory(@Query() filter: ReportFilterDto, @Request() req) {
    return await this.reportsService.getByCategory(req.user.userId, filter);
  }

  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Obter despesas mensais',
    description: 'Retorna o total gasto agrupado por mês.',
  })
  @ApiResponse({
    status: 200,
    description: 'Relatório mensal retornado com sucesso.',
    schema: { example: [{ month: '2026-04', totalIncome: 5000, totalExpense: 2300 }] },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado — token JWT ausente ou inválido.' })
  @Get('monthly')
  async getMonthly(@Query() filter: ReportFilterDto, @Request() req) {
    return await this.reportsService.getMonthly(req.user.userId, filter);
  }
}
