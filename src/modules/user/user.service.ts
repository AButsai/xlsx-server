import { Prisma } from '@/src/generated/prisma/client';
import { PrismaService } from '@/src/prisma.service';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { BunnyService } from '../bunny/bunny.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bunnyService: BunnyService,
  ) {}

  async getCurrentUser(id: number | undefined) {
    if (!id) throw new UnauthorizedException('NOT_UNAUTHORIZED');

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        payment: true,
      },
    });

    if (!user) throw new UnauthorizedException('NOT_UNAUTHORIZED');

    return user;
  }

  async getFilesUser(
    userId: number | undefined,
    type: string,
    search: string,
    page: number,
    limit: number,
  ) {
    const where: Prisma.FileWhereInput = {
      userId,
    };

    if (type !== 'all') {
      where.type = type;
    }

    if (search.trim().length >= 3) {
      where.title = {
        contains: search.trim(),
        mode: 'insensitive',
      };
    }

    const files = await this.prisma.file.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.prisma.file.count({
      where,
    });

    const countXlsxFiles = await this.prisma.file.count({
      where: { userId, type: 'xlsx' },
    });
    const countCsvFiles = await this.prisma.file.count({
      where: { userId, type: 'csv' },
    });

    return {
      data: files,
      meta: {
        totalCsv: countCsvFiles,
        totalXlsx: countXlsxFiles,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getShops(
    userId: number | undefined,
    search: string,
    page: number,
    limit: number,
  ) {
    const where: Prisma.StoreWhereInput = {
      userId,
    };

    if (search.trim().length >= 3) {
      where.title = {
        contains: search.trim(),
        mode: 'insensitive',
      };
    }

    const stores = await this.prisma.store.findMany({
      where,
      select: {
        id: true,
        title: true,
        shopDomain: true,
        apiVersion: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.prisma.store.count({ where });

    return {
      data: stores,
      meta: {
        totalCsv: 0,
        totalXlsx: 0,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getHistory(
    userId: number | undefined,
    search: string,
    page: number,
    limit: number,
  ) {
    const where: Prisma.HistoryConvertWhereInput = {
      userId,
    };

    if (search.trim().length >= 3) {
      where.titleCsv = {
        contains: search.trim(),
        mode: 'insensitive',
      };
    }
    const files = await this.prisma.historyConvert.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.prisma.historyConvert.count({
      where: {
        userId,
      },
    });

    return {
      data: files,
      meta: {
        totalCsv: 0,
        totalXlsx: 0,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async deleteFile(id: number) {
    const template = await this.prisma.file.findUnique({
      where: { id },
    });

    if (!template) throw new NotFoundException('TEMPLATE_NOT_FOUND');

    await this.bunnyService.remove(template.fileUrl);

    await this.prisma.file.delete({ where: { id: template.id } });

    return { access: true };
  }

  async deleteFileHistory(id: number) {
    const file = await this.prisma.historyConvert.findUnique({
      where: { id },
    });

    if (!file) throw new NotFoundException('TEMPLATE_NOT_FOUND');

    await this.prisma.historyConvert.delete({ where: { id: file.id } });

    return { access: true };
  }
}
