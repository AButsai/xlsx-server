import { JwtAuthGuard } from '@/src/guards/jwtGuard/jwt-auth.guard';
import {
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { type Request } from 'express';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('current')
  async getCurrentUser(@Req() req: Request) {
    return await this.userService.getCurrentUser(req.user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('files')
  async getFilesUser(
    @Req() req: Request,
    @Query('type') type: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
    @Query('search') search: string,
  ) {
    return await this.userService.getFilesUser(
      req.user?.id,
      type,
      search,
      page,
      limit,
    );
  }
  @UseGuards(JwtAuthGuard)
  @Get('files/history')
  async getHistory(
    @Req() req: Request,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
    @Query('search') search: string,
  ) {
    return await this.userService.getHistory(req.user?.id, search, page, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get('shops')
  async getShops(
    @Req() req: Request,
    @Query('search') search: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(8), ParseIntPipe) limit: number,
  ) {
    if (!req.user) {
      return;
    }
    return await this.userService.getShops(req.user.id, search, page, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('file/:id')
  async deleteFile(@Param('id', ParseIntPipe) id: number) {
    return await this.userService.deleteFile(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('file/history/:id')
  async deleteFileHistory(@Param('id', ParseIntPipe) id: number) {
    return await this.userService.deleteFileHistory(id);
  }
}
