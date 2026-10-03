import { buildPaginationMeta, isPaginated, mapPaginated } from './paginated';

describe('pagination helpers', () => {
  it('computes total pages', () => {
    expect(buildPaginationMeta(2, 10, 25)).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
    });
    expect(buildPaginationMeta(1, 10, 0).totalPages).toBe(0);
  });

  it.each([
    [{ items: [], meta: {} }, true],
    [{ items: 'nope', meta: {} }, false],
    [{ items: [] }, false],
    [null, false],
    ['text', false],
  ])('detects paginated payload %p', (value, expected) => {
    expect(isPaginated(value)).toBe(expected);
  });

  it('maps items while keeping meta', () => {
    const meta = buildPaginationMeta(1, 10, 2);

    expect(mapPaginated({ items: [1, 2], meta }, (n) => n * 2)).toEqual({
      items: [2, 4],
      meta,
    });
  });
});
