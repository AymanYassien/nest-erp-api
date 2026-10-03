import { Injectable } from '@nestjs/common';
import {
  mapPaginated,
  PageRequest,
  Paginated,
} from '../../../common/pagination/paginated';
import { KnexRepository } from '../../../database/knex-repository';
import { paginate } from '../../../database/knex-paginate';
import { containsPattern } from '../../../database/like-pattern';
import {
  CategoriesRepository,
  CategoryListFilter,
  CategorySortField,
} from '../domain/categories.repository';
import {
  Category,
  CategoryChanges,
  NewCategory,
} from '../domain/category.entity';

interface CategoryRow {
  id: string;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

const SORT_COLUMNS: Record<CategorySortField, string> = {
  name: 'name',
  createdAt: 'created_at',
};

@Injectable()
export class KnexCategoriesRepository
  extends KnexRepository
  implements CategoriesRepository
{
  async findById(id: string): Promise<Category | null> {
    const row = await this.knex<CategoryRow>('categories')
      .where({ id })
      .first();
    return row ? toEntity(row) : null;
  }

  async list(
    filter: CategoryListFilter,
    page: PageRequest<CategorySortField>,
  ): Promise<Paginated<Category>> {
    const query = this.knex<CategoryRow>('categories').select('*');
    if (filter.search) {
      query.whereILike('name', containsPattern(filter.search));
    }
    const result = await paginate<CategoryRow, CategorySortField>(
      query,
      page,
      SORT_COLUMNS,
      'id',
    );
    return mapPaginated(result, toEntity);
  }

  async create(category: NewCategory): Promise<Category> {
    const [row] = await this.knex<CategoryRow>('categories')
      .insert(category)
      .returning('*');
    return toEntity(row);
  }

  async update(id: string, changes: CategoryChanges): Promise<Category | null> {
    const [row] = await this.knex<CategoryRow>('categories')
      .where({ id })
      .update({
        name: changes.name,
        description: changes.description,
        updated_at: this.knex.fn.now() as unknown as Date,
      })
      .returning('*');
    return row ? toEntity(row) : null;
  }

  async delete(id: string): Promise<boolean> {
    return (await this.knex('categories').where({ id }).delete()) > 0;
  }
}

function toEntity(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
