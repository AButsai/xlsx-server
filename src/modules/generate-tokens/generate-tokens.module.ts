import { PrismaService } from '@/src/prisma.service';
import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GenerateTokensController } from './generate-tokens.controller';
import { GenerateTokensService } from './generate-tokens.service';

@Module({
  controllers: [GenerateTokensController],
  providers: [GenerateTokensService, PrismaService, JwtService],
  exports: [GenerateTokensService],
})
export class GenerateTokensModule {}
