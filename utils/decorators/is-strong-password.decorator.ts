import { Matches } from 'class-validator';

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/;

const STRONG_PASSWORD_MESSAGE =
  'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';

export const IsStrongPassword = () =>
  Matches(STRONG_PASSWORD_REGEX, { message: STRONG_PASSWORD_MESSAGE });
