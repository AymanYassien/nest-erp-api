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
import { CreateUserDto } from '../application/dto/create-user.dto';
import { ListUsersQueryDto } from '../application/dto/list-users-query.dto';
import { UpdateUserDto } from '../application/dto/update-user.dto';
import { UserResponseDto } from '../application/dto/user-response.dto';
import { UsersService } from '../application/users.service';

@ApiTags('Users')
@ApiBearerAuth()
@ApiErrors(HttpStatus.UNAUTHORIZED)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiEnvelope(UserResponseDto)
  me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponseDto> {
    return this.usersService.findById(user.id);
  }

  @Get()
  @Roles(Role.Admin, Role.Manager)
  @ApiOperation({ summary: 'List users with filters, sorting and pagination' })
  @ApiEnvelope(UserResponseDto, { paginated: true })
  @ApiErrors(HttpStatus.FORBIDDEN)
  list(@Query() query: ListUsersQueryDto): Promise<Paginated<UserResponseDto>> {
    return this.usersService.list(query);
  }

  @Get(':id')
  @Roles(Role.Admin, Role.Manager)
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiEnvelope(UserResponseDto)
  @ApiErrors(HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND)
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.usersService.findById(id);
  }

  @Post()
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Create a user with any role' })
  @ApiEnvelope(UserResponseDto, { status: HttpStatus.CREATED })
  @ApiErrors(HttpStatus.BAD_REQUEST, HttpStatus.FORBIDDEN, HttpStatus.CONFLICT)
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Update name, role or active flag' })
  @ApiEnvelope(UserResponseDto)
  @ApiErrors(
    HttpStatus.BAD_REQUEST,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.UNPROCESSABLE_ENTITY,
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a user',
    description:
      'Users that own orders cannot be deleted (400); deactivate them instead.',
  })
  @ApiNoContentResponse()
  @ApiErrors(
    HttpStatus.BAD_REQUEST,
    HttpStatus.FORBIDDEN,
    HttpStatus.NOT_FOUND,
    HttpStatus.UNPROCESSABLE_ENTITY,
  )
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    return this.usersService.remove(id, actor);
  }
}
