import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalsService } from './goals.service';

@ApiTags('goals')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('goals')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar meta financeira' })
  @ApiResponse({ status: 201, description: 'Meta criada com sucesso.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  create(@Body() dto: CreateGoalDto, @Request() req) {
    return this.goalsService.create(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar metas do usuário' })
  @ApiResponse({ status: 200, description: 'Metas retornadas com sucesso.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  findAll(@Request() req) {
    return this.goalsService.findAll(req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar meta por ID' })
  @ApiResponse({ status: 200, description: 'Meta retornada com sucesso.' })
  @ApiResponse({ status: 404, description: 'Meta não encontrada.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.goalsService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar meta' })
  @ApiResponse({ status: 200, description: 'Meta atualizada com sucesso.' })
  @ApiResponse({ status: 404, description: 'Meta não encontrada.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGoalDto, @Request() req) {
    return this.goalsService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover meta (soft delete)' })
  @ApiResponse({ status: 200, description: 'Meta removida com sucesso.' })
  @ApiResponse({ status: 404, description: 'Meta não encontrada.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.goalsService.remove(id, req.user.userId);
  }
}
