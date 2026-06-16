/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import * as BunnyStorageSDK from '@bunny.net/storage-sdk';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'node:stream';
import { ReadableStream } from 'node:stream/web';

@Injectable()
export class BunnyService {
  private storageZone: BunnyStorageSDK.StorageZone;
  private BUNNY_API_KEY: string;
  private BUNNY_STORAGE_ZONE: string;

  constructor(private readonly configService: ConfigService) {
    this.BUNNY_API_KEY =
      this.configService.get<string>('BUNNY_API_KEY') || 'BUNNY_API_KEY';
    this.BUNNY_STORAGE_ZONE =
      this.configService.get<string>('BUNNY_STORAGE_ZONE') ||
      'BUNNY_STORAGE_ZONE';

    this.storageZone = BunnyStorageSDK.zone.connect_with_accesskey(
      BunnyStorageSDK.regions.StorageRegion.Falkenstein,
      this.BUNNY_STORAGE_ZONE,
      this.BUNNY_API_KEY,
    );
  }

  async upload(path: string, buffer: Buffer): Promise<boolean> {
    const webStream = Readable.toWeb(
      Readable.from(buffer),
    ) as ReadableStream<Uint8Array>;

    return await BunnyStorageSDK.file.upload(this.storageZone, path, webStream);
  }

  async remove(urlImg: string) {
    return await BunnyStorageSDK.file.remove(this.storageZone, urlImg);
  }
}
