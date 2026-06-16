import { Module } from '@nestjs/common';

import { BunnyService } from './bunny.service';

@Module({
  imports: [],
  controllers: [],
  providers: [BunnyService],
  exports: [BunnyService],
})
export class BunnyModule {}
