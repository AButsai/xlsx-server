import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { GenerateCsvModule } from '../generate-csv/generate-csv.module';
import { GqlRequestModule } from '../gql-request/gql-request.module';
import { MetafieldController } from './metafield.controller';
import { MetafieldService } from './metafield.service';

@Module({
  imports: [GenerateCsvModule, GqlRequestModule],
  controllers: [MetafieldController],
  providers: [MetafieldService, JwtService],
})
export class MetafieldModule {}
