import { EShopApiVersion } from '@/src/shared/enums/shop-api-version.enum';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class ShopifyCredentialDto {
  @IsNotEmpty({ message: 'Not empty' })
  @IsUrl({}, { message: 'Invalid URL' })
  shopDomain: string;

  @IsNotEmpty({ message: 'Not empty' })
  @IsString()
  accessToken: string;

  @IsNotEmpty({ message: 'Not empty' })
  @IsString()
  title: string;

  @IsOptional()
  @IsEnum(EShopApiVersion)
  apiVersion?: string;
}
