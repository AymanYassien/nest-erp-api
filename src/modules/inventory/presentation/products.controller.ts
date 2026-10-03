import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Paginated } from '../../../common/pagination/paginated';
import {
  ApiEnvelope,
  ApiErrors,
} from '../../../common/swagger/api-envelope.decorator';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { Role } from '../../../common/types/role.enum';
import {
  CreateProductDto,
  ListProductsQueryDto,
  ProductResponseDto,
  UpdateProductDto,
} from '../application/dto/product.dto';
import {
  CreateStockMovementDto,
  ListStockMovementsQueryDto,
  StockMovementResponseDto,
} from '../application/dto/stock-movement.dto';
import { ProductsService } from '../application/products.service';
import { StockService } from '../application/stock.service';

@ApiTags('Inventory - Products')
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED)
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly stockService: StockService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List products with filters, sorting and pagination',
  })
  @ApiEnvelope(ProductResponseDto, { paginated: true })
  @ApiErrors(HttpStatus.BAD_REQUEST)
  list(
    @Query() query: ListProductsQueryDto,
  ): Promise<Paginated<ProductResponseDto>> {
    return this.productsService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product' })
  @ApiEnvelope(ProductResponseDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProductResponseDto> {
    return this.productsService.findById(id);
  }

  @Post()
  @Roles(Role.Admin, Role.Manager)
  @ApiOperation({ summary: 'Create a product, optionally with opening stock' })
  @ApiEnvelope(ProductResponseDto, { status: HttpStatus.CREATED })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.FORBIDDEN, HttpStatus.CONFLICT)
  create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProductResponseDto> {
    return this.productsService.create(dto, user);
  }

  @Patch(':id')
  @Roles(Role.Admin, Role.Manager)
  @ApiOperation({
    summary: 'Update product details',
    description:
      'Stock cannot be edited here; record a stock movement instead.',
  })
  @ApiEnvelope(ProductResponseDto)
  @ApiErrors(
    HttpStatus.BAD_REQUEST,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a product' })
  @ApiNoContentResponse()
  @ApiErrors(HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.productsService.remove(id);
  }

  @Post(':id/restore')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore a soft-deleted product' })
  @ApiEnvelope(ProductResponseDto)
  @ApiErrors(HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.CONFLICT)
  restore(@Param('id', ParseUUIDPipe) id: string): Promise<ProductResponseDto> {
    return this.productsService.restore(id);
  }

  @Post(':id/stock-movements')
  @Roles(Role.Admin, Role.Manager)
  @ApiOperation({
    summary: 'Record a stock movement',
    description:
      'Applies the change to the product stock and stores the movement in a single transaction.',
  })
  @ApiEnvelope(StockMovementResponseDto, { status: HttpStatus.CREATED })
  @ApiErrors(
    HttpStatus.BAD_REQUEST,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
    HttpStatus.UNPROCESSABLE_ENTITY,
  )
  recordMovement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateStockMovementDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StockMovementResponseDto> {
    return this.stockService.recordMovement(id, dto, user);
  }

  @Get(':id/stock-movements')
  @Roles(Role.Admin, Role.Manager)
  @ApiOperation({ summary: 'List the stock movement history of a product' })
  @ApiEnvelope(StockMovementResponseDto, { paginated: true })
  @ApiErrors(HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  listMovements(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListStockMovementsQueryDto,
  ): Promise<Paginated<StockMovementResponseDto>> {
    return this.stockService.listMovements(id, query);
  }
}
