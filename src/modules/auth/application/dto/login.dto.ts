import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizeEmail } from '../../../../common/validation/transforms';

export class LoginDto {
  @ApiProperty({ example: 'admin@erp.local' })
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password: string;
}
