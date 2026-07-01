import { JwtAuthGuard } from '@/src/guards/jwtGuard/jwt-auth.guard';
import { ETypeFile } from '@/src/shared/enums/file.type.enum';
import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { type Request } from 'express';
import { ShopifyCredentialDto } from '../shopify-credentials/dto/credentials.dto';
import { StoreService } from './store.service';

@Controller('stores')
export class StoreController {
  constructor(private readonly storeService: StoreService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getStores(@Req() req: Request) {
    return await this.storeService.getStores(req.user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('files')
  async getFilesStore(
    @Req() req: Request,
    @Query('type') type: ETypeFile,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
  ) {
    return await this.storeService.getFilesStore(
      req.user?.id,
      type,
      page,
      limit,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateStore(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<ShopifyCredentialDto>,
  ) {
    return await this.storeService.updateStore(req.user?.id, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteStore(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.storeService.deleteStore(req.user?.id, id);
  }
}
