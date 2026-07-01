import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateCsvDto {
  @IsNotEmpty()
  @IsString()
  title: string;
}
