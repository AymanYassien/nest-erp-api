export type SortOrder = 'asc' | 'desc';

export interface PageRequest<TSort extends string = string> {
  page: number;
  limit: number;
  sortBy: TSort;
  sortOrder: SortOrder;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

export function isPaginated(value: unknown): value is Paginated<unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<Paginated<unknown>>;
  return Array.isArray(candidate.items) && typeof candidate.meta === 'object';
}

export function mapPaginated<T, R>(
  page: Paginated<T>,
  mapper: (item: T) => R,
): Paginated<R> {
  return { items: page.items.map(mapper), meta: page.meta };
}
