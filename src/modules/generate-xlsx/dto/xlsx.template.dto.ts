import { IsArray, IsString } from 'class-validator';

export class XlsxTemplateDto {
  @IsString()
  title: string;

  @IsArray()
  metafields: string[];
}
