import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { SupersetService } from './superset.service';

interface GenerateGuestTokenDto {
  resources: Array<{
    type: 'dashboard' | 'chart';
    id: string;
  }>;
  user?: {
    username: string;
    first_name?: string;
    last_name?: string;
  };
  rls?: Array<{
    clause: string;
  }>;
}

@Controller('api/superset')
export class SupersetController {
  constructor(private readonly supersetService: SupersetService) {}

  @Post('guest-token')
  @HttpCode(HttpStatus.OK)
  async generateGuestToken(
    @Body() dto: GenerateGuestTokenDto
  ): Promise<{ token: string }> {
    if (
      !dto.resources ||
      !Array.isArray(dto.resources) ||
      dto.resources.length === 0
    ) {
      throw new BadRequestException(
        'Resources array is required and must contain at least one resource'
      );
    }

    // Validate resource types
    for (const resource of dto.resources) {
      if (!resource.type || !['dashboard', 'chart'].includes(resource.type)) {
        throw new BadRequestException(
          `Invalid resource type: ${resource.type}. Must be 'dashboard' or 'chart'`
        );
      }
      if (!resource.id) {
        throw new BadRequestException('Resource ID is required');
      }
    }

    try {
      return await this.supersetService.generateGuestToken(
        dto.resources,
        dto.user,
        dto.rls
      );
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
