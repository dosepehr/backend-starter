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
} from '@nestjs/common';
import { HumanService } from './human.service';
import { CreateHumanDto } from './dto/create-human.dto';
import { UpdateHumanDto } from './dto/update-human.dto';
import { PaginationDto } from 'utils/common/pagination/pagination.dto';
import { ApiTags } from '@nestjs/swagger';
import { Human } from './entities/human.entity';
import { ApiPaginated } from 'utils/decorators/docs-paginated.decorator';
import {
  DocsResponse,
  DocsResponseNull,
} from 'utils/decorators/docs-response.decorator';
import { DocsErrors } from 'utils/decorators/docs-errors.decorator';

@ApiTags('Human')
@Controller('human')
export class HumanController {
  constructor(private readonly humanService: HumanService) {}

  @Get()
  @ApiPaginated(Human)
  findAll(
    @Query() query: Record<string, string>,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.humanService.findAll(query, paginationDto);
  }

  @Get(':id')
  @DocsResponse('Human fetched successfully', Human)
  @DocsErrors(404)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.humanService.findOne(id);
  }

  @Post()
  @DocsResponse('Human created successfully', Human)
  @DocsErrors(400)
  create(@Body() createHumanDto: CreateHumanDto) {
    return this.humanService.create(createHumanDto);
  }

  @Patch(':id')
  @DocsResponse('Human updated successfully', Human)
  @DocsErrors(400, 404)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateHumanDto: UpdateHumanDto,
  ) {
    return this.humanService.update(id, updateHumanDto);
  }

  @Delete(':id/soft')
  @DocsResponseNull('Human soft deleted successfully')
  @DocsErrors(404)
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.humanService.softDelete(id);
  }

  @Patch(':id/recover')
  @DocsResponseNull('Human recovered successfully')
  @DocsErrors(404)
  recover(@Param('id', ParseIntPipe) id: number) {
    return this.humanService.recover(id);
  }

  @Delete(':id/hard')
  @DocsResponseNull('Human hard deleted successfully')
  @DocsErrors(404)
  hardDelete(@Param('id', ParseIntPipe) id: number) {
    return this.humanService.hardDelete(id);
  }
}
