import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GqlRequestModule } from '../gql-request/gql-request.module';
import { ParseXlsxModule } from '../parse-xlsx/parse-xlsx.module';
import { MetafieldController } from './metafield.controller';
import { MetafieldService } from './metafield.service';

@Module({
  imports: [ParseXlsxModule, GqlRequestModule, ParseXlsxModule],
  controllers: [MetafieldController],
  providers: [MetafieldService, JwtService],
})
export class MetafieldModule {}
