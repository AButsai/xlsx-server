import { EnumRole } from '@/src/generated/prisma/enums';
import { PrismaService } from '@/src/prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcryptjs from 'bcryptjs';
import { GenerateTokensService } from '../generate-tokens/generate-tokens.service';
import { AuthDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokensService: GenerateTokensService,
  ) {}

  async register(dto: AuthDto) {
    const { email, password } = dto;

    const candidate = await this.prisma.user.findUnique({
      where: { email },
    });

    if (candidate) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: EnumRole.USER,
      },
    });

    const tokens = await this.tokensService.generateTokens(newUser);

    return tokens?.accessToken;
  }

  async login(dto: AuthDto) {
    const { email, password } = dto;

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new NotFoundException('USER_NOT_FOUND');
    }
    const passwordCompare = await bcryptjs.compare(password, user.password!);

    if (!passwordCompare) {
      throw new UnauthorizedException('PASSWORD_OR_EMAIL_WRONG');
    }

    const tokens = await this.tokensService.generateTokens(user);

    return tokens?.accessToken;
  }

  async logout(id: number | undefined) {
    if (!id) return;

    await this.prisma.user.update({
      where: { id },
      data: {
        accessToken: null,
      },
    });

    return 'Logout...';
  }
}
