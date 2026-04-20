import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportFilterDto } from '../reports/dto/create-report.dto';

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  async getTransactions(userId: number, filter: ReportFilterDto) {
    const dateFilter = this.buildDateFilter(filter);
    return this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(dateFilter && { date: dateFilter }),
      },
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  generateCsv(transactions: Record<string, unknown>[]): string {
    const header = 'ID,Descrição,Valor,Tipo,Data,Categoria\n';
    const rows = transactions
      .map((t: any) => {
        const date = new Date(t.date).toISOString().split('T')[0];
        const categoryName = t.category?.name ?? 'Sem categoria';
        // Escapar aspas duplas em campos de texto
        const title = String(t.title).replace(/"/g, '""');
        const catName = String(categoryName).replace(/"/g, '""');
        return `${t.id},"${title}",${t.amount},${t.type},${date},"${catName}"`;
      })
      .join('\n');

    return header + rows;
  }

  async generatePdf(transactions: Record<string, unknown>[]): Promise<Buffer> {
    const PDFDocument = (await import('pdfkit')).default;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Título
      doc.fontSize(20).text('Relatório de Transações', { align: 'center' });
      doc.moveDown();
      doc
        .fontSize(10)
        .text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, { align: 'center' });
      doc.moveDown(2);

      // Cabeçalho da tabela
      const startX = 50;
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Descrição', startX, doc.y, { width: 150, continued: false });
      const headerY = doc.y - 12;
      doc.text('Valor', startX + 160, headerY, { width: 70 });
      doc.text('Tipo', startX + 240, headerY, { width: 70 });
      doc.text('Data', startX + 310, headerY, { width: 80 });
      doc.text('Categoria', startX + 390, headerY, { width: 100 });

      doc.moveDown(0.5);
      doc
        .moveTo(startX, doc.y)
        .lineTo(startX + 490, doc.y)
        .stroke();
      doc.moveDown(0.5);

      // Linhas
      doc.font('Helvetica').fontSize(8);
      let totalIncome = 0;
      let totalExpense = 0;

      for (const t of transactions as any[]) {
        if (doc.y > 700) {
          doc.addPage();
        }

        const date = new Date(t.date).toLocaleDateString('pt-BR');
        const categoryName = t.category?.name ?? 'Sem categoria';
        const rowY = doc.y;

        doc.text(String(t.title).substring(0, 30), startX, rowY, { width: 150 });
        doc.text(`R$ ${Number(t.amount).toFixed(2)}`, startX + 160, rowY, { width: 70 });
        doc.text(t.type, startX + 240, rowY, { width: 70 });
        doc.text(date, startX + 310, rowY, { width: 80 });
        doc.text(String(categoryName).substring(0, 20), startX + 390, rowY, { width: 100 });
        doc.moveDown(0.3);

        if (t.type === 'INCOME') totalIncome += Number(t.amount);
        else if (t.type === 'EXPENSE') totalExpense += Number(t.amount);
      }

      // Resumo
      doc.moveDown(2);
      doc
        .moveTo(startX, doc.y)
        .lineTo(startX + 490, doc.y)
        .stroke();
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text(`Total Receitas: R$ ${totalIncome.toFixed(2)}`);
      doc.text(`Total Despesas: R$ ${totalExpense.toFixed(2)}`);
      doc.text(`Saldo: R$ ${(totalIncome - totalExpense).toFixed(2)}`);

      doc.end();
    });
  }

  private buildDateFilter(filter: ReportFilterDto) {
    const dateFilter: Record<string, Date> = {};
    if (filter.startDate) dateFilter.gte = new Date(filter.startDate);
    if (filter.endDate) dateFilter.lte = new Date(filter.endDate);
    return Object.keys(dateFilter).length ? dateFilter : undefined;
  }
}
