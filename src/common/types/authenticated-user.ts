import { Role } from './role.enum';

/** What the JWT guard attaches to `request.user` after verifying a token. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: Role;
}
