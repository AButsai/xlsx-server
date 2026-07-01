import {
  Controller,
  Patch,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TagsService } from './tags.service';

@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Patch()
  @UseInterceptors(FileInterceptor('file'))
  async updateTags(@UploadedFile() file: Express.Multer.File) {
    return await this.tagsService.updateTags(file);
  }
}
