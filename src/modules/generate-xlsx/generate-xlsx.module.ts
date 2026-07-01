import { JwtGuardsModule } from '@/src/guards/jwtGuard/jwt-guard.module';
import { PrismaService } from '@/src/prisma.service';
import { Module } from '@nestjs/common';
import { BunnyModule } from '../bunny/bunny.module';
import { GenerateXlsxController } from './generate-xlsx.controller';
import { GenerateXlsxService } from './generate-xlsx.service';

@Module({
  imports: [BunnyModule, JwtGuardsModule],
  controllers: [GenerateXlsxController],
  providers: [GenerateXlsxService, PrismaService],
})
export class GenerateXlsxModule {}
