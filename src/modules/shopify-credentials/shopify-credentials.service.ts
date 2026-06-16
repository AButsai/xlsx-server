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
    userId: string | undefined,
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

    const shop = await this.prisma.storeConfig.findUnique({
      where: { shopDomain },
    });

    if (shop) throw new ConflictException('Store config is extension');

    const newStoreConfig = await this.prisma.storeConfig.create({
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

  async getCredentials(userId: string | undefined) {
    if (!userId) throw new UnauthorizedException('NOT_AUTHORIZED');
    const user = await this.getUser(userId);
    return await this.prisma.storeConfig.findMany({
      where: { userId: user.id },
      select: {
        title: true,
        id: true,
      },
    });
  }

  async deleteCredentials(userId: string | undefined, id: string) {
    if (!userId) throw new UnauthorizedException('NOT_AUTHORIZED');
    await this.getUser(userId);
    await this.prisma.storeConfig.delete({ where: { id } });

    return `Stor config deleted. Id: ${id}`;
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) throw new NotFoundException('User not found');

    return user;
  }
}
