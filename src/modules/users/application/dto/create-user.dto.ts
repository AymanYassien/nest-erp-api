import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, Length } from 'class-validator';
import { Role } from '../../../../common/types/role.enum';
import { NormalizeEmail, Trim } from './normalize';
import { IsStrongPassword } from './password.validator';

export class CreateUserDto {
  @ApiProperty({ example: 'jane.doe@acme.com' })
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'S3cure-Passw0rd', minLength: 8, maxLength: 72 })
  @IsStrongPassword()
  password: string;

  @ApiProperty({ example: 'Jane Doe' })
  @Trim()
  @IsString()
  @Length(2, 120)
  fullName: string;

  @ApiProperty({ enum: Role, example: Role.Manager })
  @IsEnum(Role)
  role: Role;
}
