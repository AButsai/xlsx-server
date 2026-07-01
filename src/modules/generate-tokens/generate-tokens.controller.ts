import { Controller, Get } from '@nestjs/common';
import { GenerateTokensService } from './generate-tokens.service';

@Controller('tokens')
export class GenerateTokensController {
  constructor(private readonly tokensService: GenerateTokensService) {}

  @Get('refresh')
  async refreshToken() {}
}
