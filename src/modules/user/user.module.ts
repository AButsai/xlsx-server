import { JwtGuardsModule } from '@/src/guards/jwtGuard/jwt-guard.module';
import { PrismaService } from '@/src/prisma.service';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BunnyModule } from '../bunny/bunny.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [JwtGuardsModule, BunnyModule],
  controllers: [UserController],
  providers: [UserService, ConfigService, PrismaService],
})
export class UserModule {}
