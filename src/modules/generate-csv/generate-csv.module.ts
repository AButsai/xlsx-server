import { PrismaService } from '@/src/prisma.service';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BunnyModule } from '../bunny/bunny.module';
import { GenerateCsvController } from './generate-csv.controller';
import { GenerateCsvService } from './generate-csv.service';

@Module({
  imports: [BunnyModule],
  controllers: [GenerateCsvController],
  providers: [GenerateCsvService, JwtService, PrismaService, ConfigService],
  exports: [GenerateCsvService],
})
export class GenerateCsvModule {}
