import { JwtAuthGuard } from '@/src/guards/jwtGuard/jwt-auth.guard';
import {
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { DeleteProductsService } from './delete-products.service';

@Controller('delete-products')
export class DeleteProductsController {
  constructor(private readonly deleteProductsService: DeleteProductsService) {}

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteProducts(@Param('id', ParseIntPipe) id: number) {
    return await this.deleteProductsService.deleteProducts(id);
  }
}
