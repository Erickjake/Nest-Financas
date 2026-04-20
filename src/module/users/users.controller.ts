import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
  @Get()
  async findAll() {
    return await this.usersService.findAll();
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
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.usersService.findOne(+id);
  }

  @ApiOperation({
    summary: 'Atualizar usuário',
    description: 'Atualiza dados de um usuário existente. Campos são opcionais.',
  })
  @ApiResponse({ status: 200, description: 'Usuário atualizado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @ApiOperation({
    summary: 'Deletar usuário',
    description: 'Remove um usuário da base de dados pelo ID.',
  })
  @ApiResponse({ status: 200, description: 'Usuário deletado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado.' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
