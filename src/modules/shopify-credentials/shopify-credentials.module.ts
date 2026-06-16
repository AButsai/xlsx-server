import { PrismaService } from '@/src/prisma.service';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ShopifyCredentialsController } from './shopify-credentials.controller';
import { ShopifyCredentialsService } from './shopify-credentials.service';

@Module({
  controllers: [ShopifyCredentialsController],
  providers: [
    ShopifyCredentialsService,
    PrismaService,
    JwtService,
    ConfigService,
  ],
})
export class ShopifyCredentialsModule {}
