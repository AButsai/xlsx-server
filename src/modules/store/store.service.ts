import { PrismaService } from '@/src/prisma.service';
import { ETypeFile } from '@/src/shared/enums/file.type.enum';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ShopifyCredentialDto } from '../shopify-credentials/dto/credentials.dto';

@Injectable()
export class StoreService {
  constructor(private readonly prisma: PrismaService) {}

  async getStores(userId: number | undefined) {
    if (!userId) throw new UnauthorizedException('NOT_AUTHORIZED');
    const user = await this.getUser(userId);
    return await this.prisma.store.findMany({
      where: { userId: user.id },
      select: {
        title: true,
        id: true,
        files: true,
      },
    });
  }

  async getFilesStore(
    userId: number | undefined,
    type: ETypeFile,
    page: number,
    limit: number,
  ) {
    const query = {
      userId,
    };

    if (type !== ETypeFile.ALL) {
      query['type'] = type;
    }

    const files = await this.prisma.file.findMany({
      where: query,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return files;
  }

  async updateStore(
    userId: number | undefined,
    shopId: number,
    dto: Partial<ShopifyCredentialDto>,
  ) {
    if (!userId) return;
    await this.getUser(userId);

    await this.prisma.store.update({
      where: { id: shopId },
      data: { ...dto },
    });

    return { access: true };
  }

  async deleteStore(userId: number | undefined, id: number) {
    if (!userId) throw new UnauthorizedException('NOT_AUTHORIZED');
    await this.getUser(userId);
    await this.prisma.store.delete({ where: { id } });

    return `Stor config deleted. Id: ${id}`;
  }

  private async getUser(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) throw new NotFoundException('User not found');

    return user;
  }
}
