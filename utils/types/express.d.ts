import { AuthenticatedUser } from 'utils/interfaces/jwt-payload.interface';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
    requestId?: string;
    startTime?: number;
  }
}
