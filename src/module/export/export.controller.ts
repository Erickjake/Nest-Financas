import { Controller, Get, Query, Request, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportFilterDto } from '../reports/dto/create-report.dto';
import { ExportService } from './export.service';

@ApiTags('export')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('csv')
  @ApiOperation({
    summary: 'Exportar transações em CSV',
    description:
      'Gera e baixa um arquivo CSV com todas as transações do usuário, com filtro opcional por datas.',
  })
  @ApiProduces('text/csv')
  @ApiResponse({ status: 200, description: 'Arquivo CSV gerado com sucesso.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  async exportCsv(@Query() filter: ReportFilterDto, @Request() req, @Res() res: Response) {
    const transactions = await this.exportService.getTransactions(req.user.userId, filter);
    const csv = this.exportService.generateCsv(transactions as Record<string, unknown>[]);

    const filename = `transacoes_${new Date().toISOString().split('T')[0]}.csv`;
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    // BOM para Excel reconhecer UTF-8
    res.send(`\uFEFF${csv}`);
  }

  @Get('pdf')
  @ApiOperation({
    summary: 'Exportar transações em PDF',
    description:
      'Gera e baixa um arquivo PDF com relatório de todas as transações do usuário, com filtro opcional por datas.',
  })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'Arquivo PDF gerado com sucesso.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  async exportPdf(@Query() filter: ReportFilterDto, @Request() req, @Res() res: Response) {
    const transactions = await this.exportService.getTransactions(req.user.userId, filter);
    const pdfBuffer = await this.exportService.generatePdf(
      transactions as Record<string, unknown>[],
    );

    const filename = `transacoes_${new Date().toISOString().split('T')[0]}.pdf`;
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': pdfBuffer.length.toString(),
    });
    res.end(pdfBuffer);
  }
}
