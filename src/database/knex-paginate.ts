import type { Knex } from 'knex';
import {
  buildPaginationMeta,
  PageRequest,
  Paginated,
} from '../common/pagination/paginated';

/**
 * Runs a filtered query as a page plus a total count.
 * `sortColumns` maps public sort keys to real columns so user input never
 * reaches ORDER BY directly.
 */
export async function paginate<TRow, TSort extends string>(
  query: Knex.QueryBuilder,
  request: PageRequest<TSort>,
  sortColumns: Record<TSort, string>,
  tieBreaker: string,
): Promise<Paginated<TRow>> {
  const countQuery = query
    .clone()
    .clearSelect()
    .clearOrder()
    .count<{ count: string }[]>({ count: '*' });

  const rowsQuery = query
    .clone()
    .orderBy(sortColumns[request.sortBy], request.sortOrder)
    .orderBy(tieBreaker, request.sortOrder)
    .limit(request.limit)
    .offset((request.page - 1) * request.limit);

  const [[{ count }], rows] = await Promise.all([
    countQuery,
    rowsQuery as Promise<TRow[]>,
  ]);

  return {
    items: rows,
    meta: buildPaginationMeta(request.page, request.limit, Number(count)),
  };
}
