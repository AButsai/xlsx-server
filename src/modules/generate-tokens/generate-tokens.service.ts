import { PrismaService } from '@/src/prisma.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokensDto } from './dto/tokens.dto';

@Injectable()
export class GenerateTokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateTokens(dto: TokensDto) {
    const { email } = dto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return null;
    }

    const payload = {
      id: user?.id,
      email: user?.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret:
        this.configService.get<string>('ACCESS_TOKEN_KEY') ||
        'ACCESS_TOKEN_KEY',
    });

    await this.prisma.user.update({
      where: { id: user?.id },
      data: {
        accessToken,
      },
    });

    return {
      accessToken,
    };
  }
}
