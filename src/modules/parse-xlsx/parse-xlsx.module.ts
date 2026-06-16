import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BunnyModule } from '../bunny/bunny.module';
import { ParseXlsxController } from './parse-xlsx.controller';
import { ParseXlsxService } from './parse-xlsx.service';

@Module({
  imports: [BunnyModule],
  controllers: [ParseXlsxController],
  providers: [ParseXlsxService, JwtService],
  exports: [ParseXlsxService],
})
export class ParseXlsxModule {}
