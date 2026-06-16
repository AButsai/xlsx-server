import { PrismaService } from '@/src/prisma.service';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { GqlRequestService } from './gql-request.service';

@Module({
  controllers: [],
  providers: [GqlRequestService, PrismaService, JwtService, ConfigService],
  exports: [GqlRequestService],
})
export class GqlRequestModule {}
