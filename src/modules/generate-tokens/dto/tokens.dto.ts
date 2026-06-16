import { IsEmail } from 'class-validator';

export class TokensDto {
  @IsEmail()
  email: string;
}
