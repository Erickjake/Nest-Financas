import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiOperation({
    summary: 'Criar nova categoria',
    description: 'Registra uma nova categoria com nome, descrição, cor e ícone.',
  })
  @ApiResponse({
    status: 201,
    description: 'Categoria criada com sucesso.',
    schema: {
      example: {
        id: 1,
        name: 'Alimentação',
        description: 'Gastos com comida',
        color: '#FF5733',
        icon: 'utensils',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos (nome obrigatório ou formato incorreto).',
  })
  @UseGuards(AuthGuard('jwt'))
  @ApiSecurity('cookie-auth')
  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @ApiOperation({
    summary: 'Listar todas as categorias',
    description: 'Retorna lista completa de todas as categorias registradas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de categorias retornada com sucesso.',
    schema: {
      example: [
        {
          id: 1,
          name: 'Alimentação',
          description: 'Gastos com comida',
          color: '#FF5733',
          icon: 'utensils',
        },
      ],
    },
  })
  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @ApiOperation({
    summary: 'Buscar categoria por ID',
    description: 'Retorna os detalhes de uma categoria específica.',
  })
  @ApiResponse({
    status: 200,
    description: 'Categoria encontrada.',
    schema: {
      example: {
        id: 1,
        name: 'Alimentação',
        description: 'Gastos com comida',
        color: '#FF5733',
        icon: 'utensils',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada.' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  @ApiOperation({
    summary: 'Atualizar categoria por ID',
    description:
      'Atualiza os detalhes de uma categoria específica. Campos não enviados permanecem inalterados.',
  })
  @ApiResponse({ status: 200, description: 'Categoria atualizada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada.' })
  @UseGuards(AuthGuard('jwt'))
  @ApiSecurity('cookie-auth')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @ApiOperation({
    summary: 'Excluir categoria por ID',
    description: 'Exclui uma categoria específica com base em seu ID.',
  })
  @ApiResponse({ status: 200, description: 'Categoria excluída com sucesso.' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada.' })
  @UseGuards(AuthGuard('jwt'))
  @ApiSecurity('cookie-auth')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }
}
