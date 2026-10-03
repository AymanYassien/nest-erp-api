import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';
import { NormalizeEmail, Trim } from '../../../../common/validation/transforms';
import { IsStrongPassword } from '../../../../common/validation/is-strong-password';

export class RegisterDto {
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
}
