import { Body, Controller, Get, Post, Request, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { BackupService } from './backup.service';
import { RestoreBackupDto } from './dto/restore-backup.dto';

@ApiTags('backup')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get()
  @ApiOperation({
    summary: 'Exportar backup dos dados',
    description: 'Exporta todas as transações, categorias e orçamentos do usuário em formato JSON.',
  })
  @ApiProduces('application/json')
  @ApiResponse({ status: 200, description: 'Backup gerado com sucesso.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  async exportBackup(@Request() req, @Res() res: Response) {
    const data = await this.backupService.exportData(req.user.userId);

    const filename = `backup_${new Date().toISOString().split('T')[0]}.json`;
    res.set({
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.json(data);
  }

  @Post('restore')
  @ApiOperation({
    summary: 'Restaurar dados de um backup',
    description:
      'Importa transações, categorias e orçamentos a partir de um JSON de backup. Não remove dados existentes.',
  })
  @ApiResponse({
    status: 201,
    description: 'Backup restaurado com sucesso.',
    schema: {
      example: {
        message: 'Backup restaurado com sucesso',
        imported: { transactions: 10, categories: 3, budgets: 2 },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos no corpo da requisição.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  async restoreBackup(@Body() dto: RestoreBackupDto, @Request() req) {
    return this.backupService.importData(req.user.userId, dto);
  }
}
