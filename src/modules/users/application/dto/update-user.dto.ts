import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { Role } from '../../../../common/types/role.enum';
import { Trim } from '../../../../common/validation/transforms';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jane Smith' })
  @IsOptional()
  @Trim()
  @IsString()
  @Length(2, 120)
  fullName?: string;

  @ApiPropertyOptional({ enum: Role, example: Role.Manager })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
