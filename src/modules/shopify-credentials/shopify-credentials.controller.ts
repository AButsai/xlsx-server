import { JwtAuthGuard } from '@/src/guards/jwtGuard/jwt-auth.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { type Request } from 'express';
import { ShopifyCredentialDto } from './dto/credentials.dto';
import { ShopifyCredentialsService } from './shopify-credentials.service';

@Controller('shopify-credentials')
export class ShopifyCredentialsController {
  constructor(
    private readonly shopifyCredentialsService: ShopifyCredentialsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async createCredential(
    @Req() req: Request,
    @Body() dto: ShopifyCredentialDto,
  ) {
    return await this.shopifyCredentialsService.createCredential(
      req.user?.id,
      dto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getCredentials(@Req() req: Request) {
    return await this.shopifyCredentialsService.getCredentials(req.user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteCredentials(@Req() req: Request, @Param('id') id: string) {
    return await this.shopifyCredentialsService.deleteCredentials(
      req.user?.id,
      id,
    );
  }
}
