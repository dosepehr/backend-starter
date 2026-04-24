import { UserRole } from 'src/modules/users/enums/user-role.enum';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  userId: number;
  role: UserRole;
}

export class TokenResponseDto {
  accessToken: string;
  refreshToken: string;
}
