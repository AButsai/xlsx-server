import { JwtGuardsModule } from '@/src/guards/jwtGuard/jwt-guard.module';
import { PrismaService } from '@/src/prisma.service';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';

@Module({
  imports: [JwtGuardsModule],
  controllers: [StoreController],
  providers: [StoreService, ConfigService, PrismaService],
})
export class StoreModule {}
