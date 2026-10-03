import { NotFoundError } from '../../../common/errors/domain.errors';
import { CategoriesRepository } from '../domain/categories.repository';
import { buildCategory } from '../testing/builders';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let repo: jest.Mocked<CategoriesRepository>;
  let service: CategoriesService;

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new CategoriesService(repo);
  });

  it('lists categories with filters and paging', async () => {
    const meta = { page: 1, limit: 20, total: 1, totalPages: 1 };
    repo.list.mockResolvedValue({ items: [buildCategory()], meta });

    const result = await service.list({
      page: 1,
      limit: 20,
      sortBy: 'name',
      sortOrder: 'asc',
      search: 'to',
    });

    expect(repo.list).toHaveBeenCalledWith(
      { search: 'to' },
      { page: 1, limit: 20, sortBy: 'name', sortOrder: 'asc' },
    );
    expect(result.items).toHaveLength(1);
  });

  it('finds a category by id', async () => {
    repo.findById.mockResolvedValue(buildCategory());
    await expect(service.findById('category-1')).resolves.toMatchObject({
      name: 'Tools',
    });
  });

  it('throws NotFoundError for unknown categories', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.findById('x')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('creates a category with a null description by default', async () => {
    repo.create.mockResolvedValue(buildCategory());

    await service.create({ name: 'Tools' });

    expect(repo.create).toHaveBeenCalledWith({
      name: 'Tools',
      description: null,
    });
  });

  it('updates a category', async () => {
    repo.update.mockResolvedValue(buildCategory({ name: 'Hardware' }));
    await expect(
      service.update('category-1', { name: 'Hardware' }),
    ).resolves.toMatchObject({ name: 'Hardware' });
  });

  it('throws NotFoundError when updating a missing category', async () => {
    repo.update.mockResolvedValue(null);
    await expect(service.update('x', { name: 'Y' })).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it('deletes a category', async () => {
    repo.delete.mockResolvedValue(true);
    await expect(service.remove('category-1')).resolves.toBeUndefined();
  });

  it('throws NotFoundError when deleting a missing category', async () => {
    repo.delete.mockResolvedValue(false);
    await expect(service.remove('x')).rejects.toBeInstanceOf(NotFoundError);
  });
});
