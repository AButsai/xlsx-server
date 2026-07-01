import { User } from '@/src/generated/prisma/client';

export type TUser = Omit<User, 'password' | 'accessToken'>;

export enum ELangue {
  UK = 'uk',
  EN = 'en',
}
