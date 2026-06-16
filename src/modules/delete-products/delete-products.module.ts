import { PrismaService } from '@/src/prisma.service';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { GqlRequestModule } from '../gql-request/gql-request.module';
import { DeleteProductsController } from './delete-products.controller';
import { DeleteProductsService } from './delete-products.service';

@Module({
  imports: [GqlRequestModule],
  controllers: [DeleteProductsController],
  providers: [DeleteProductsService, PrismaService, JwtService, ConfigService],
})
export class DeleteProductsModule {}
