import { PrismaService } from '@/src/prisma.service';
import { standardColumns } from '@/src/shared/constants/default.value.xls';
import { ETypeFile } from '@/src/shared/enums/file.type.enum';
import { formatFileSize } from '@/src/shared/utils/file.size';
import { normalizeFilename } from '@/src/shared/utils/normalize.filename';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ExcelJS from 'exceljs';
import { BunnyService } from '../bunny/bunny.service';
import { XlsxTemplateDto } from './dto/xlsx.template.dto';

@Injectable()
export class GenerateXlsxService {
  private PUBLIC_BUNNY_URL: string | undefined;
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly bunnyService: BunnyService,
  ) {
    this.PUBLIC_BUNNY_URL =
      this.configService.get<string | undefined>('PUBLIC_BUNNY_URL') ||
      undefined;
  }

  async createXlsxTemplate(
    id: number | undefined,
    storeId: number = 0,
    dto: XlsxTemplateDto,
  ) {
    if (!this.PUBLIC_BUNNY_URL) {
      throw new BadRequestException('NO_PUBLIC_BUNNY_URL');
    }

    const user = await this.getUser(id);

    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    const workbook = new ExcelJS.Workbook();

    workbook.creator = 'Shopify Product Manager';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Products');

    const columns = [...standardColumns, ...dto.metafields];

    worksheet.columns = columns.map((key) => ({
      header: key,
      key,
      width: this.getColumnWidth(key),
    }));

    worksheet.views = [
      {
        state: 'frozen',
        ySplit: 1,
      },
    ];

    const headerRow = worksheet.getRow(1);

    headerRow.eachCell((cell) => {
      cell.font = {
        bold: true,
      };

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: '#ffff00',
        },
      };

      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
      };
    });

    worksheet.autoFilter = {
      from: 'A1',
      to: worksheet.getCell(1, columns.length).address,
    };

    headerRow.height = 25;

    worksheet.getRow(1).font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };

    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF111827' },
    };

    worksheet.getRow(1).alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };

    worksheet.getRow(1).height = 24;

    worksheet.views = [
      {
        state: 'frozen',
        ySplit: 1,
      },
    ];

    worksheet.autoFilter = {
      from: 'A1',
      to: worksheet.getCell(1, columns.length).address,
    };

    for (let i = 0; i < 50; i++) {
      worksheet.addRow({});
    }

    const fileName = store
      ? `${normalizeFilename(store.title)}_${user.id}`
      : `${normalizeFilename(dto.title)}_${user.id}`;
    const path = `files/${user.id}/xlsx/${fileName}.xlsx`;

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const fileSize = buffer.length;

    const size = formatFileSize(fileSize);

    await this.bunnyService.upload(path, buffer);

    await this.prisma.file.create({
      data: {
        title: fileName,
        fileUrl: path,
        userId: user.id,
        storeId: store ? store.id : null,
        type: ETypeFile.XLSX,
        size,
      },
    });

    return `${this.PUBLIC_BUNNY_URL}/${path}`;
  }

  private getColumnWidth(column: string): number {
    if (column === 'Title') return 32;
    if (column === 'Media urls') return 50;
    if (column === 'Tags') return 35;
    if (column === 'Category') return 28;
    if (column === 'Product url') return 50;

    return 22;
  }

  private async getUser(id: number | undefined) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) throw new NotFoundException('User not found');

    return user;
  }
}
