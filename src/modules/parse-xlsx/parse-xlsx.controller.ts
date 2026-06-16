import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParseXlsxService } from './parse-xlsx.service';

@Controller('parse-xlsx')
export class ParseXlsxController {
  constructor(private readonly parseXlsxService: ParseXlsxService) {}

  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.parseXlsxService.uploadFile(file);
  }
}
