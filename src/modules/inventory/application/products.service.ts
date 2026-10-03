import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../../common/errors/domain.errors';
import { mapPaginated, Paginated } from '../../../common/pagination/paginated';
import { UnitOfWork } from '../../../common/persistence/unit-of-work';
import { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { ProductsRepository } from '../domain/products.repository';
import { StockMovementType } from '../domain/stock-movement.entity';
import { StockMovementsRepository } from '../domain/stock-movements.repository';
import {
  CreateProductDto,
  ListProductsQueryDto,
  ProductResponseDto,
  UpdateProductDto,
} from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly products: ProductsRepository,
    private readonly movements: StockMovementsRepository,
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async list(
    query: ListProductsQueryDto,
  ): Promise<Paginated<ProductResponseDto>> {
    const { page, limit, sortBy, sortOrder, ...filter } = query;
    const result = await this.products.list(filter, {
      page,
      limit,
      sortBy,
      sortOrder,
    });
    return mapPaginated(result, (p) => ProductResponseDto.fromEntity(p));
  }

  async findById(id: string): Promise<ProductResponseDto> {
    const product = await this.products.findById(id);
    if (!product) throw new NotFoundError('Product', id);
    return ProductResponseDto.fromEntity(product);
  }

  /** Opening stock is booked as a movement so history always explains stock. */
  async create(
    dto: CreateProductDto,
    actor: AuthenticatedUser,
  ): Promise<ProductResponseDto> {
    const initialStock = dto.initialStock ?? 0;

    const product = await this.unitOfWork.run(async (tx) => {
      const created = await this.products.create(
        {
          sku: dto.sku,
          name: dto.name,
          description: dto.description ?? null,
          price: dto.price,
          stock: initialStock,
          categoryId: dto.categoryId ?? null,
        },
        tx,
      );
      if (initialStock > 0) {
        await this.movements.create(
          {
            productId: created.id,
            type: StockMovementType.In,
            quantity: initialStock,
            stockAfter: initialStock,
            reason: 'Initial stock',
            orderId: null,
            createdBy: actor.id,
          },
          tx,
        );
      }
      return created;
    });

    return ProductResponseDto.fromEntity(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductResponseDto> {
    const product = await this.products.update(id, dto);
    if (!product) throw new NotFoundError('Product', id);
    return ProductResponseDto.fromEntity(product);
  }

  async remove(id: string): Promise<void> {
    if (!(await this.products.softDelete(id))) {
      throw new NotFoundError('Product', id);
    }
  }

  async restore(id: string): Promise<ProductResponseDto> {
    const product = await this.products.restore(id);
    if (!product) throw new NotFoundError('Deleted product', id);
    return ProductResponseDto.fromEntity(product);
  }
}
