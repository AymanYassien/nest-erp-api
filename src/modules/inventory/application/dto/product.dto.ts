import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';
import { ToBoolean, Trim } from '../../../../common/validation/transforms';
import { Product } from '../../domain/product.entity';
import {
  PRODUCT_SORT_FIELDS,
  type ProductSortField,
} from '../../domain/products.repository';

const MAX_PRICE = 9_999_999_999.99;
const SKU_PATTERN = /^[A-Z0-9][A-Z0-9-]*$/;

export class CreateProductDto {
  @ApiProperty({
    example: 'ELEC-MOUSE-WL',
    description: 'Upper-case letters, digits and dashes',
  })
  @Trim()
  @IsString()
  @Length(2, 64)
  @Matches(SKU_PATTERN, {
    message: 'sku may only contain upper-case letters, digits and dashes',
  })
  sku: string;

  @ApiProperty({ example: 'Wireless Mouse' })
  @Trim()
  @IsString()
  @Length(2, 200)
  name: string;

  @ApiPropertyOptional({ example: 'Ergonomic 2.4 GHz mouse' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 24.99, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MAX_PRICE)
  price: number;

  @ApiPropertyOptional({
    format: 'uuid',
    example: '0b6f3c9a-1d2e-4f5a-8b7c-9d0e1f2a3b4c',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    example: 50,
    default: 0,
    description: 'Opening stock, recorded as an `in` stock movement',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  initialStock?: number;
}

export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['initialStock'] as const),
) {}

export class ListProductsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PRODUCT_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(PRODUCT_SORT_FIELDS)
  sortBy: ProductSortField = 'createdAt';

  @ApiPropertyOptional({ description: 'Matches name or SKU', example: 'mouse' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Only products with stock > 0',
    example: true,
  })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  inStock?: boolean;
}

export class ProductResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '5a4b3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d',
  })
  id: string;

  @ApiProperty({ example: 'ELEC-MOUSE-WL' })
  sku: string;

  @ApiProperty({ example: 'Wireless Mouse' })
  name: string;

  @ApiProperty({
    nullable: true,
    type: String,
    example: 'Ergonomic 2.4 GHz mouse',
  })
  description: string | null;

  @ApiProperty({ example: 24.99 })
  price: number;

  @ApiProperty({ example: 50 })
  stock: number;

  @ApiProperty({ nullable: true, type: String, format: 'uuid' })
  categoryId: string | null;

  @ApiProperty({ example: '2026-01-15T09:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-15T09:30:00.000Z' })
  updatedAt: Date;

  static fromEntity(product: Product): ProductResponseDto {
    const { deletedAt: _deletedAt, ...rest } = product;
    return Object.assign(new ProductResponseDto(), rest);
  }
}
