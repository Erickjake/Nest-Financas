/**
 * 📄 Pagination DTO - Parâmetros de Paginação
 * Localização: src/common/dto/pagination.dto.ts
 *
 * FUNCIONALIDADE:
 * ✅ Reutilizável em qualquer endpoint que lista dados
 * ✅ Validação automática de page e limit
 * ✅ Segurança: impede page/limit negativos ou muito grandes
 */

import { Type } from 'class-transformer';
import { IsOptional, IsPositive, Max, Min } from 'class-validator';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsPositive({ message: 'page deve ser maior que 0' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1, { message: 'limit deve ser no mínimo 1' })
  @Max(100, { message: 'limit máximo é 100 registros por página' })
  limit?: number = 10;

  /**
   * Calcula o offset para a query SQL
   * Exemplo: page=2, limit=10 → skip=10, take=10 (registros 11-20)
   */
  getSkip(): number {
    return ((this.page || 1) - 1) * (this.limit || 10);
  }

  getLimit(): number {
    return this.limit || 10;
  }
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
