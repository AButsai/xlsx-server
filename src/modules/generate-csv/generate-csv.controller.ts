import { JwtAuthGuard } from '@/src/guards/jwtGuard/jwt-auth.guard';
import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { type Request } from 'express';
import { GenerateCsvDto } from './dto/generate.csv.dto';
import { GenerateCsvService } from './generate-csv.service';

@Controller('csv')
export class GenerateCsvController {
  constructor(private readonly generateCsvService: GenerateCsvService) {}

  @UseGuards(JwtAuthGuard)
  @Post('file/:storeId')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: GenerateCsvDto,
    @Param('storeId', ParseIntPipe) storeId?: number,
  ) {
    return this.generateCsvService.uploadFile(
      storeId,
      req.user?.id,
      file,
      dto.title,
    );
  }
}
