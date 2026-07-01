import { PrismaService } from '@/src/prisma.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ShopifyCredentialDto } from './dto/credentials.dto';

@Injectable()
export class ShopifyCredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async createCredential(
    userId: number | undefined,
    dto: ShopifyCredentialDto,
  ) {
    if (!userId) throw new UnauthorizedException('NOT_AUTHORIZED');
    const user = await this.getUser(userId);

    const payload = {
      accessToken: dto.accessToken,
    };
    const accessTokenEncrypted = this.jwtService.sign(payload, {
      expiresIn: '10y',
      secret:
        this.configService.get<string>('ACCESS_TOKEN_KEY') ||
        'ACCESS_TOKEN_KEY',
    });
    const shopDomain = new URL(dto.shopDomain).origin;

    const shop = await this.prisma.store.findUnique({
      where: { shopDomain },
    });

    if (shop) throw new ConflictException('Store config is exists');

    const newStoreConfig = await this.prisma.store.create({
      data: {
        title: dto.title,
        shopDomain,
        accessTokenEncrypted,
        apiVersion: dto.apiVersion ? dto.apiVersion : '2025-07',
        userId: user.id,
      },
    });

    return `Store config created. Id: ${newStoreConfig.id}`;
  }

  async getCredentials(userId: number | undefined, id: number) {
    return await this.prisma.store.findUnique({
      where: {
        userId,
        id,
      },
      select: {
        title: true,
        shopDomain: true,
        apiVersion: true,
        id: true,
        createdAt: true,
      },
    });
  }

  async updateCredentials(
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

  async deleteCredentials(userId: number | undefined, id: number) {
    if (!userId) throw new UnauthorizedException('NOT_AUTHORIZED');
    await this.getUser(userId);
    await this.prisma.store.delete({ where: { id } });

    return `Stor config deleted. Id: ${id}`;
  }

  async getUser(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) throw new NotFoundException('User not found');

    return user;
  }
}
