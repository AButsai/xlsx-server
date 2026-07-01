import { JwtGuardsModule } from '@/src/guards/jwtGuard/jwt-guard.module';
import { PrismaService } from '@/src/prisma.service';
import { Module } from '@nestjs/common';
import { GqlRequestModule } from '../gql-request/gql-request.module';
import { VariantsController } from './variants.controller';
import { VariantsService } from './variants.service';

@Module({
  imports: [JwtGuardsModule, GqlRequestModule],
  controllers: [VariantsController],
  providers: [VariantsService, PrismaService],
})
export class VariantsModule {}
