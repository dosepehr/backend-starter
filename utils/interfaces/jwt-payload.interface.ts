import { UserRole } from 'src/modules/users/enums/user-role.enum';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
}
