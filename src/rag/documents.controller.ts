import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiTags,
} from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { IngestDocumentDto } from './dto/ingest-document.dto';
import { ImportUrlDto, UploadDocumentMetaDto } from './dto/import-url.dto';
import { ChannelType } from '@/shared/types';

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

@ApiTags('documents')
@ApiBearerAuth('jwt')
@Controller('bots/:channel/:externalId/documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentService) {}

  @Get()
  list(
    @Param('channel') channel: ChannelType,
    @Param('externalId') externalId: string,
  ) {
    return this.documents.list(channel, externalId);
  }

  @Post()
  ingest(
    @Param('channel') channel: ChannelType,
    @Param('externalId') externalId: string,
    @Body() body: Omit<IngestDocumentDto, 'channel' | 'externalId'>,
  ) {
    return this.documents.ingest({ ...body, channel, externalId } as IngestDocumentDto);
  }

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  upload(
    @Param('channel') channel: ChannelType,
    @Param('externalId') externalId: string,
    @Body() body: Omit<UploadDocumentMetaDto, 'channel' | 'externalId'>,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: MAX_UPLOAD_BYTES })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('file is required');
    return this.documents.ingestFromFile({
      channel,
      externalId,
      overrideTitle: body.title,
      file: {
        originalname: file.originalname,
        mimetype: file.mimetype,
        buffer: file.buffer,
      },
    });
  }

  @Post('import-url')
  importUrl(
    @Param('channel') channel: ChannelType,
    @Param('externalId') externalId: string,
    @Body() body: Omit<ImportUrlDto, 'channel' | 'externalId'>,
  ) {
    return this.documents.ingestFromUrl({
      channel,
      externalId,
      url: body.url,
      overrideTitle: body.title,
    });
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.documents.delete(id);
    return { ok: true };
  }

  @Post(':id/reembed')
  async reembed(@Param('id', ParseIntPipe) id: number) {
    await this.documents.reembed(id);
    return { ok: true };
  }
}
