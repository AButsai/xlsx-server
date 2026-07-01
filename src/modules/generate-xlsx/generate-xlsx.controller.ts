import { JwtAuthGuard } from '@/src/guards/jwtGuard/jwt-auth.guard';
import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { type Request } from 'express';
import { XlsxTemplateDto } from './dto/xlsx.template.dto';
import { GenerateXlsxService } from './generate-xlsx.service';

@Controller('generate-xlsx')
export class GenerateXlsxController {
  constructor(private readonly generateXlsxService: GenerateXlsxService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':storeId')
  async createXlsxTemplate(
    @Req() req: Request,
    @Body() dto: XlsxTemplateDto,
    @Param('storeId', ParseIntPipe) storeId: number,
  ) {
    return await this.generateXlsxService.createXlsxTemplate(
      req.user?.id,
      storeId,
      dto,
    );
  }
}
