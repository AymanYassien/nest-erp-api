import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../../users/application/dto/user-response.dto';

export class TokenPairDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({
    example: 'q3Vb9cJx0m3lC7l2l1lV0x7wqkqQb2yZq4tVqk3d0bS1JmQe0p3n5Yt1wXc9e4Rr',
  })
  refreshToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: 'Bearer';

  @ApiProperty({
    description: 'Access token lifetime in seconds',
    example: 900,
  })
  expiresIn: number;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({ type: TokenPairDto })
  tokens: TokenPairDto;
}
