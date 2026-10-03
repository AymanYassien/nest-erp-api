import { PageRequest, Paginated } from '../../../common/pagination/paginated';
import { Category, CategoryChanges, NewCategory } from './category.entity';

export const CATEGORY_SORT_FIELDS = ['name', 'createdAt'] as const;
export type CategorySortField = (typeof CATEGORY_SORT_FIELDS)[number];

export interface CategoryListFilter {
  search?: string;
}

export abstract class CategoriesRepository {
  abstract findById(id: string): Promise<Category | null>;
  abstract list(
    filter: CategoryListFilter,
    page: PageRequest<CategorySortField>,
  ): Promise<Paginated<Category>>;
  abstract create(category: NewCategory): Promise<Category>;
  abstract update(
    id: string,
    changes: CategoryChanges,
  ): Promise<Category | null>;
  abstract delete(id: string): Promise<boolean>;
}
