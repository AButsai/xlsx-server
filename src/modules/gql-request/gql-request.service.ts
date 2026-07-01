/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { PrismaService } from '@/src/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import axios, { AxiosRequestConfig } from 'axios';

@Injectable()
export class GqlRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async gqlRequest<T>(
    query: string,
    id: number,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    const store = await this.prisma.store.findUnique({ where: { id } });

    if (!store) throw new NotFoundException('Store not found');

    const { accessToken } = this.jwtService.verify<{ accessToken: string }>(
      store.accessTokenEncrypted,
      {
        secret:
          this.configService.get<string>('ACCESS_TOKEN_KEY') ||
          'ACCESS_TOKEN_KEY',
      },
    );

    const config: AxiosRequestConfig = {
      method: 'post',
      url: `${store.shopDomain}/admin/api/${store.apiVersion}/graphql.json`,
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      data: { query, ...(variables ? { variables } : {}) },
    };

    const res = await axios(config);

    if (res.data.errors) {
      throw new Error(`GraphQL error: ${JSON.stringify(res.data.errors)}`);
    }

    return res.data.data as T;
  }
}
