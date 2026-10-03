import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiProperty,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}

class ErrorDetailDto {
  @ApiProperty({ example: 409 })
  statusCode: number;

  @ApiProperty({ example: 'UNIQUE_VIOLATION' })
  code: string;

  @ApiProperty({
    example: 'A record with the same unique value already exists',
  })
  message: string;

  @ApiProperty({
    required: false,
    type: [String],
    example: ['email must be an email'],
  })
  details?: string[];
}

class ErrorMetaDto {
  @ApiProperty({ example: 'POST' })
  method: string;

  @ApiProperty({ example: '/api/v1/products' })
  path: string;

  @ApiProperty({ example: '2026-01-01T12:00:00.000Z' })
  timestamp: string;
}

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success: false;

  @ApiProperty({ type: ErrorDetailDto })
  error: ErrorDetailDto;

  @ApiProperty({ type: ErrorMetaDto })
  meta: ErrorMetaDto;
}

interface EnvelopeOptions {
  status?: HttpStatus;
  description?: string;
  paginated?: boolean;
}

/** Documents a response wrapped by TransformInterceptor as `{ success, data, meta }`. */
export function ApiEnvelope(
  model: Type<unknown>,
  {
    status = HttpStatus.OK,
    description,
    paginated = false,
  }: EnvelopeOptions = {},
) {
  const data = paginated
    ? { type: 'array', items: { $ref: getSchemaPath(model) } }
    : { $ref: getSchemaPath(model) };

  return applyDecorators(
    ApiExtraModels(model, PaginationMetaDto),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', example: true },
          data,
          ...(paginated && {
            meta: { $ref: getSchemaPath(PaginationMetaDto) },
          }),
        },
      },
    }),
  );
}

/** Documents the error responses a route can return, all sharing one shape. */
export function ApiErrors(...statuses: HttpStatus[]) {
  return applyDecorators(
    ...statuses.map((status) =>
      ApiResponse({ status, type: ErrorResponseDto }),
    ),
  );
}
