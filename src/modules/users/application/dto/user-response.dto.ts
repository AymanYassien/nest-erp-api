import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../../common/types/role.enum';
import { User } from '../../domain/user.entity';

/** Public view of a user. The password hash never leaves the service. */
export class UserResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '6f1c2c1e-8a2b-4c7e-9a43-0c1d2e3f4a5b',
  })
  id: string;

  @ApiProperty({ example: 'jane.doe@acme.com' })
  email: string;

  @ApiProperty({ example: 'Jane Doe' })
  fullName: string;

  @ApiProperty({ enum: Role, example: Role.Staff })
  role: Role;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-01-15T09:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-15T09:30:00.000Z' })
  updatedAt: Date;

  static fromEntity(user: User): UserResponseDto {
    const { passwordHash: _passwordHash, ...rest } = user;
    return Object.assign(new UserResponseDto(), rest);
  }
}
