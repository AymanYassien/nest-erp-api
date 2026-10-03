import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Paginated } from '../../../common/pagination/paginated';
import {
  ApiEnvelope,
  ApiErrors,
} from '../../../common/swagger/api-envelope.decorator';
import { Role } from '../../../common/types/role.enum';
import { CategoriesService } from '../application/categories.service';
import {
  CategoryResponseDto,
  CreateCategoryDto,
  ListCategoriesQueryDto,
  UpdateCategoryDto,
} from '../application/dto/category.dto';

@ApiTags('Inventory - Categories')
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List categories' })
  @ApiEnvelope(CategoryResponseDto, { paginated: true })
  list(
    @Query() query: ListCategoriesQueryDto,
  ): Promise<Paginated<CategoryResponseDto>> {
    return this.categoriesService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a category' })
  @ApiEnvelope(CategoryResponseDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.findById(id);
  }

  @Post()
  @Roles(Role.Admin, Role.Manager)
  @ApiOperation({ summary: 'Create a category' })
  @ApiEnvelope(CategoryResponseDto, { status: HttpStatus.CREATED })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.FORBIDDEN, HttpStatus.CONFLICT)
  create(@Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.Admin, Role.Manager)
  @ApiOperation({ summary: 'Update a category' })
  @ApiEnvelope(CategoryResponseDto)
  @ApiErrors(
    HttpStatus.BAD_REQUEST,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a category',
    description: 'Products in the category are kept and become uncategorised.',
  })
  @ApiNoContentResponse()
  @ApiErrors(HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.categoriesService.remove(id);
  }
}
