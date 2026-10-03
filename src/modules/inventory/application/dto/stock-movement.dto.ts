import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  NotEquals,
} from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';
import { Trim } from '../../../../common/validation/transforms';
import {
  StockMovement,
  StockMovementType,
} from '../../domain/stock-movement.entity';
import {
  STOCK_MOVEMENT_SORT_FIELDS,
  type StockMovementSortField,
} from '../../domain/stock-movements.repository';

export class CreateStockMovementDto {
  @ApiProperty({ enum: StockMovementType, example: StockMovementType.In })
  @IsEnum(StockMovementType)
  type: StockMovementType;

  @ApiProperty({
    example: 20,
    description:
      'Positive amount for `in`/`out`; signed delta for `adjustment` (e.g. -2)',
  })
  @IsInt()
  @NotEquals(0)
  quantity: number;

  @ApiPropertyOptional({ example: 'Supplier delivery #4471' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

export class ListStockMovementsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: STOCK_MOVEMENT_SORT_FIELDS,
    default: 'createdAt',
  })
  @IsOptional()
  @IsIn(STOCK_MOVEMENT_SORT_FIELDS)
  sortBy: StockMovementSortField = 'createdAt';

  @ApiPropertyOptional({ enum: StockMovementType })
  @IsOptional()
  @IsEnum(StockMovementType)
  type?: StockMovementType;
}

export class StockMovementResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '9e8d7c6b-5a4f-4e3d-8c2b-1a0f9e8d7c6b',
  })
  id: string;

  @ApiProperty({
    format: 'uuid',
    example: '5a4b3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d',
  })
  productId: string;

  @ApiProperty({ enum: StockMovementType, example: StockMovementType.In })
  type: StockMovementType;

  @ApiProperty({ example: 20, description: 'Signed change applied to stock' })
  quantity: number;

  @ApiProperty({ example: 70 })
  stockAfter: number;

  @ApiProperty({
    nullable: true,
    type: String,
    example: 'Supplier delivery #4471',
  })
  reason: string | null;

  @ApiProperty({ nullable: true, type: String, format: 'uuid' })
  orderId: string | null;

  @ApiProperty({ nullable: true, type: String, format: 'uuid' })
  createdBy: string | null;

  @ApiProperty({ example: '2026-01-15T09:30:00.000Z' })
  createdAt: Date;

  static fromEntity(movement: StockMovement): StockMovementResponseDto {
    return Object.assign(new StockMovementResponseDto(), movement);
  }
}
