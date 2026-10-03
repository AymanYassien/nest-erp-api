import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  CreateOrderDto,
  ListOrdersQueryDto,
  OrderResponseDto,
  UpdateOrderStatusDto,
} from '../application/dto/order.dto';
import { OrdersService } from '../application/orders.service';

@ApiTags('Orders')
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Place an order',
    description:
      'Checks and decrements stock for every line inside one transaction. If any line has insufficient stock nothing is saved.',
  })
  @ApiEnvelope(OrderResponseDto, { status: HttpStatus.CREATED })
  @ApiErrors(
    HttpStatus.BAD_REQUEST,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
    HttpStatus.UNPROCESSABLE_ENTITY,
  )
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    return this.ordersService.create(dto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'List orders',
    description:
      'Admins and managers see all orders; staff see only their own.',
  })
  @ApiEnvelope(OrderResponseDto, { paginated: true })
  @ApiErrors(HttpStatus.BAD_REQUEST)
  list(
    @Query() query: ListOrdersQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Paginated<OrderResponseDto>> {
    return this.ordersService.list(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order with its items' })
  @ApiEnvelope(OrderResponseDto)
  @ApiErrors(HttpStatus.NOT_FOUND)
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    return this.ordersService.findById(id, user);
  }

  @Patch(':id/status')
  @Roles(Role.Admin, Role.Manager)
  @ApiOperation({
    summary: 'Advance the order status',
    description:
      'pending → confirmed → shipped → delivered. Pending and confirmed orders can be cancelled, which returns their stock. Other transitions return 409.',
  })
  @ApiEnvelope(OrderResponseDto)
  @ApiErrors(
    HttpStatus.BAD_REQUEST,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.CONFLICT,
  )
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderResponseDto> {
    return this.ordersService.updateStatus(id, dto.status, user);
  }
}
