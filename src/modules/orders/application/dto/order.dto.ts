import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDate,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';
import { Trim } from '../../../../common/validation/transforms';
import { Order, OrderItem } from '../../domain/order.entity';
import { OrderStatus } from '../../domain/order-status';
import {
  ORDER_SORT_FIELDS,
  type OrderSortField,
} from '../../domain/orders.repository';

export class CreateOrderItemDto {
  @ApiProperty({
    format: 'uuid',
    example: '5a4b3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: 10_000 })
  @IsInt()
  @Min(1)
  @Max(10_000)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({
    type: [CreateOrderItemDto],
    example: [
      { productId: '5a4b3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d', quantity: 2 },
      { productId: '0b6f3c9a-1d2e-4f5a-8b7c-9d0e1f2a3b4c', quantity: 1 },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({ example: 'Deliver to loading dock B' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.Confirmed })
  @IsEnum(OrderStatus)
  status: OrderStatus;
}

export class ListOrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ORDER_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(ORDER_SORT_FIELDS)
  sortBy: OrderSortField = 'createdAt';

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Admins and managers only; staff always see their own orders',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdFrom?: Date;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.999Z' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  createdTo?: Date;
}

export class OrderItemResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
  })
  id: string;

  @ApiProperty({
    format: 'uuid',
    example: '5a4b3c2d-1e0f-4a9b-8c7d-6e5f4a3b2c1d',
  })
  productId: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 24.99 })
  unitPrice: number;

  @ApiProperty({ example: 49.98 })
  lineTotal: number;

  static fromEntity(item: OrderItem): OrderItemResponseDto {
    const { orderId: _orderId, ...rest } = item;
    return Object.assign(new OrderItemResponseDto(), rest);
  }
}

export class OrderResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '7d6c5b4a-3f2e-4d1c-9b8a-7f6e5d4c3b2a',
  })
  id: string;

  @ApiProperty({
    format: 'uuid',
    example: '6f1c2c1e-8a2b-4c7e-9a43-0c1d2e3f4a5b',
  })
  userId: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.Pending })
  status: OrderStatus;

  @ApiProperty({ example: 49.98 })
  totalAmount: number;

  @ApiProperty({
    nullable: true,
    type: String,
    example: 'Deliver to loading dock B',
  })
  notes: string | null;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];

  @ApiProperty({ example: '2026-01-15T09:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-15T09:30:00.000Z' })
  updatedAt: Date;

  static fromEntity(order: Order): OrderResponseDto {
    return Object.assign(new OrderResponseDto(), {
      ...order,
      items: order.items.map((item) => OrderItemResponseDto.fromEntity(item)),
    });
  }
}
