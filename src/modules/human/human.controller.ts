import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { HumanService } from './human.service';
import { CreateHumanDto } from './dto/create-human.dto';
import { UpdateHumanDto } from './dto/update-human.dto';
import { PaginationDto } from 'utils/common/pagination/pagination.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Human } from './entities/human.entity';
import { ApiPaginated } from 'utils/decorators/docs-paginated.decorator';
import {
  DocsResponse,
  DocsResponseNull,
} from 'utils/decorators/docs-response.decorator';
import { DocsErrors } from 'utils/decorators/docs-errors.decorator';
import { Roles } from 'utils/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { Public } from 'utils/decorators/public.decorator';
import { FileService } from '../file/file.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerStorage } from 'config/multer.config';

@ApiTags('Human')
@Controller('human')
export class HumanController {
  constructor(
    private readonly humanService: HumanService,
    private readonly fileService: FileService,
  ) {}

  @Public()
  @Get()
  @ApiPaginated(Human)
  findAll(
    @Query() query: Record<string, string>,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.humanService.findAll(query, paginationDto);
  }

  @Public()
  @Get(':id')
  @DocsResponse('Human fetched successfully', Human)
  @DocsErrors(404)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.humanService.findOne(id);
  }

  @Roles(UserRole.ADMIN)
  @Post(':id/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', { storage: multerStorage('avatars') }),
  )
  async uploadAvatar(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const uploaded = await this.fileService.upload(file, {
      allowedMimes: ['image/jpeg', 'image/png', 'image/webp'],
      maxSize: 5 * 1024 * 1024,
      destination: 'avatars',
    });

    return this.humanService.updateAvatar(id, uploaded.id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @DocsResponse('Human created successfully', Human)
  @DocsErrors(400)
  create(@Body() createHumanDto: CreateHumanDto) {
    return this.humanService.create(createHumanDto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @DocsResponse('Human updated successfully', Human)
  @DocsErrors(400, 404)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateHumanDto: UpdateHumanDto,
  ) {
    return this.humanService.update(id, updateHumanDto);
  }

  @Delete(':id/soft')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @DocsResponseNull('Human soft deleted successfully')
  @DocsErrors(404)
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.humanService.softDelete(id);
  }

  @Patch(':id/recover')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @DocsResponseNull('Human recovered successfully')
  @DocsErrors(400, 404)
  recover(@Param('id', ParseIntPipe) id: number) {
    return this.humanService.recover(id);
  }

  @Delete(':id/hard')
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @DocsResponseNull('Human hard deleted successfully')
  @DocsErrors(404)
  hardDelete(@Param('id', ParseIntPipe) id: number) {
    return this.humanService.hardDelete(id);
  }
}
