import { AuthenticatedUser } from './jwt-payload.interface';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      accessToken?: string;
    }
  }
}

export {};
