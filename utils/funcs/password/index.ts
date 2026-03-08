import * as bcrypt from 'bcrypt';

const saltOrRounds = 10;

export const generateHash = async (password: string) => {
  const hash = await bcrypt.hash(password, saltOrRounds);
  return hash;
};

export const compareHash = async (password: string, hash: string) => {
  return await bcrypt.compare(password, hash);
};
