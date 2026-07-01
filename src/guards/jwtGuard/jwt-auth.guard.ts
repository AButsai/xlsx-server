import { TUser } from '@/src/shared/types/user.types';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

type JwtPayload = {
  id: number;
  email: string;
};

type RequestWithCookies = Request & {
  cookies?: {
    accessToken?: string;
  };
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithCookies>();

    const token = this.extractToken(req);

    if (!token) {
      throw new UnauthorizedException('TOKEN_NOT_FOUND');
    }

    try {
      const user = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('ACCESS_TOKEN_KEY'),
      });

      req.user = user as TUser;

      return true;
    } catch {
      throw new UnauthorizedException('NOT_AUTHORIZED_JWT_EXPIRED');
    }
  }

  private extractToken(req: RequestWithCookies): string | null {
    const cookieToken = req.cookies?.accessToken;

    if (cookieToken) {
      return cookieToken;
    }

    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return null;
    }

    const [bearer, token] = authHeader.split(' ');

    if (bearer !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}
