import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../common/errors/domain.errors';
import { mapPaginated, Paginated } from '../../../common/pagination/paginated';
import { CategoriesRepository } from '../domain/categories.repository';
import {
  CategoryResponseDto,
  CreateCategoryDto,
  ListCategoriesQueryDto,
  UpdateCategoryDto,
} from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly categories: CategoriesRepository) {}

  async list(
    query: ListCategoriesQueryDto,
  ): Promise<Paginated<CategoryResponseDto>> {
    const { page, limit, sortBy, sortOrder, search } = query;
    const result = await this.categories.list(
      { search },
      { page, limit, sortBy, sortOrder },
    );
    return mapPaginated(result, (c) => CategoryResponseDto.fromEntity(c));
  }

  async findById(id: string): Promise<CategoryResponseDto> {
    const category = await this.categories.findById(id);
    if (!category) throw new NotFoundError('Category', id);
    return CategoryResponseDto.fromEntity(category);
  }

  // Duplicate names are rejected by the unique index and mapped to 409.
  async create(dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const category = await this.categories.create({
      name: dto.name,
      description: dto.description ?? null,
    });
    return CategoryResponseDto.fromEntity(category);
  }

  async update(
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const category = await this.categories.update(id, dto);
    if (!category) throw new NotFoundError('Category', id);
    return CategoryResponseDto.fromEntity(category);
  }

  /** Products in the category keep existing and become uncategorised. */
  async remove(id: string): Promise<void> {
    if (!(await this.categories.delete(id))) {
      throw new NotFoundError('Category', id);
    }
  }
}
