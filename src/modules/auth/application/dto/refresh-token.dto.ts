import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description:
      'The refresh token returned by login, register or a previous refresh',
    example: 'q3Vb9cJx0m3lC7l2l1lV0x7wqkqQb2yZq4tVqk3d0bS1JmQe0p3n5Yt1wXc9e4Rr',
  })
  @IsString()
  @Length(20, 200)
  refreshToken: string;
}
