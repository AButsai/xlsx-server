import { PrismaService } from '@/src/prisma.service';
import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GenerateTokensService } from './generate-tokens.service';

@Module({
  providers: [GenerateTokensService, PrismaService, JwtService],
  exports: [GenerateTokensService],
})
export class GenerateTokensModule {}
