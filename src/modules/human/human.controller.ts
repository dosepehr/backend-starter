// src/human/human.controller.ts
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
import { ResponseMessage } from 'utils/decorators/response-message.decorator';

@Controller('human')
export class HumanController {
  constructor(private readonly humanService: HumanService) {}

  @Post()
  @ResponseMessage('Human created successfully')
  create(@Body() createHumanDto: CreateHumanDto) {
    return this.humanService.create(createHumanDto);
  }

  @Get()
  findAll(
    @Query() query: Record<string, string>,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.humanService.findAll(query, paginationDto);
  }

  @Get(':id')
  @ResponseMessage('Human fetched successfully')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.humanService.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Human updated successfully')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateHumanDto: UpdateHumanDto,
  ) {
    return this.humanService.update(id, updateHumanDto);
  }

  @Delete(':id/soft')
  @ResponseMessage('Human soft deleted successfully')
  softDelete(@Param('id', ParseIntPipe) id: number) {
    return this.humanService.softDelete(id);
  }

  @Patch(':id/recover')
  @ResponseMessage('Human recovered successfully')
  recover(@Param('id', ParseIntPipe) id: number) {
    return this.humanService.recover(id);
  }

  @Delete(':id/hard')
  @ResponseMessage('Human hard deleted successfully')
  hardDelete(@Param('id', ParseIntPipe) id: number) {
    return this.humanService.hardDelete(id);
  }
}
