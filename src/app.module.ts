import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { CorsMiddleware } from './middlewares/cors-middleware';
import { AuthModule } from './modules/auth/auth.module';
import { BunnyModule } from './modules/bunny/bunny.module';
import { DeleteProductsModule } from './modules/delete-products/delete-products.module';
import { GqlRequestModule } from './modules/gql-request/gql-request.module';
import { MetafieldModule } from './modules/metafield/metafield.module';
import { ParseXlsxModule } from './modules/parse-xlsx/parse-xlsx.module';
import { ShopifyCredentialsModule } from './modules/shopify-credentials/shopify-credentials.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    BunnyModule,
    AuthModule,
    ShopifyCredentialsModule,
    DeleteProductsModule,
    MetafieldModule,
    GqlRequestModule,
    ParseXlsxModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorsMiddleware).forRoutes('*');
  }
}
