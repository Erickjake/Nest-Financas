import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary: 'Criar novo usuário',
    description: 'Registra um novo usuário com email, nome e senha. Email deve ser único.',
  })
  @ApiResponse({
    status: 201,
    description: 'Usuário criado com sucesso.',
    schema: { example: { id: 1, name: 'João Silva', email: 'joao@email.com' } },
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos (campo obrigatório ausente ou formato incorreto).',
  })
  @ApiResponse({ status: 409, description: 'Email já cadastrado.' })
  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    return await this.usersService.create(createUserDto);
  }

  @ApiOperation({
    summary: 'Listar todos os usuários',
    description: 'Retorna lista completa de todos os usuários registrados.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuários retornada com sucesso.',
    schema: { example: [{ id: 1, name: 'João Silva', email: 'joao@email.com' }] },
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiSecurity('cookie-auth')
  @Get()
  async findAll() {
    return await this.usersService.findAll();
  }

  @ApiOperation({
    summary: 'Retornar perfil do usuário autenticado',
    description: 'Retorna os dados do usuário que está autenticado via JWT.',
  })
  @ApiSecurity('cookie-auth')
  @ApiResponse({
    status: 200,
    description: 'Perfil do usuário autenticado.',
    schema: { example: { id: 1, name: 'João Silva', email: 'joao@email.com' } },
  })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async findMe(@Req() req: Request & { user: { userId: number; email: string } }) {
    return await this.usersService.findOne(req.user.userId);
  }

  @ApiOperation({
    summary: 'Buscar usuário por ID',
    description: 'Retorna os detalhes de um usuário específico.',
  })
  @ApiResponse({
    status: 200,
    description: 'Usuário encontrado.',
    schema: { example: { id: 1, name: 'João Silva', email: 'joao@email.com' } },
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  @UseGuards(AuthGuard('jwt'))
  @ApiSecurity('cookie-auth')
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return await this.usersService.findOne(id);
  }

  @ApiOperation({
    summary: 'Atualizar usuário',
    description: 'Atualiza dados de um usuário existente. Campos são opcionais.',
  })
  @ApiResponse({ status: 200, description: 'Usuário atualizado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  @UseGuards(AuthGuard('jwt'))
  @ApiSecurity('cookie-auth')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: Request & { user: { userId: number; email: string } },
  ) {
    if (req.user.userId !== id) {
      throw new ForbiddenException('Você não tem permissão para editar este usuário');
    }
    return this.usersService.update(id, updateUserDto);
  }

  @ApiOperation({
    summary: 'Deletar usuário',
    description: 'Remove um usuário da base de dados pelo ID.',
  })
  @ApiResponse({ status: 200, description: 'Usuário deletado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  @UseGuards(AuthGuard('jwt'))
  @ApiSecurity('cookie-auth')
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { userId: number; email: string } },
  ) {
    if (req.user.userId !== id) {
      throw new ForbiddenException('Você não tem permissão para deletar este usuário');
    }
    return this.usersService.remove(id);
  }
}
