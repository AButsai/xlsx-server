import { User } from '../generated/prisma/browser';

export type TUser = Omit<User, 'password' | 'accessToken'>;

export enum ELangue {
  UK = 'uk',
  EN = 'en',
}
