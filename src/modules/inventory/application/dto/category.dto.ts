import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/pagination/pagination-query.dto';
import { Trim } from '../../../../common/validation/transforms';
import { Category } from '../../domain/category.entity';
import {
  CATEGORY_SORT_FIELDS,
  type CategorySortField,
} from '../../domain/categories.repository';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Electronics' })
  @Trim()
  @IsString()
  @Length(2, 100)
  name: string;

  @ApiPropertyOptional({ example: 'Devices and accessories' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}

export class ListCategoriesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CATEGORY_SORT_FIELDS, default: 'name' })
  @IsOptional()
  @IsIn(CATEGORY_SORT_FIELDS)
  sortBy: CategorySortField = 'name';

  @ApiPropertyOptional({
    description: 'Matches the category name',
    example: 'elec',
  })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class CategoryResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '0b6f3c9a-1d2e-4f5a-8b7c-9d0e1f2a3b4c',
  })
  id: string;

  @ApiProperty({ example: 'Electronics' })
  name: string;

  @ApiProperty({
    nullable: true,
    type: String,
    example: 'Devices and accessories',
  })
  description: string | null;

  @ApiProperty({ example: '2026-01-15T09:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-15T09:30:00.000Z' })
  updatedAt: Date;

  static fromEntity(category: Category): CategoryResponseDto {
    return Object.assign(new CategoryResponseDto(), category);
  }
}
