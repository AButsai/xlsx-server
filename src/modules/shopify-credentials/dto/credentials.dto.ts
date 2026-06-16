import { EShopApiVersion } from '@/src/enums/shop-api-version.enum';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class ShopifyCredentialDto {
  @IsNotEmpty()
  @IsUrl()
  shopDomain: string;

  @IsNotEmpty()
  @IsString()
  accessToken: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsEnum(EShopApiVersion)
  apiVersion?: string;
}
