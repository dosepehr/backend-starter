import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { HumanService } from './human.service';
import { CreateHumanDto } from './dto/create-human.dto';
import { UpdateHumanDto } from './dto/update-human.dto';
import { PaginationDto } from 'utils/common/pagination/pagination.dto';

@Controller('human')
export class HumanController {
  constructor(private readonly humanService: HumanService) {}

  @Post()
  create(@Body() createHumanDto: CreateHumanDto) {
    return this.humanService.create(createHumanDto);
  }

  @Get()
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query() query: Record<string, string>,
  ) {
    return this.humanService.findAll(query, paginationDto);
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.humanService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateHumanDto: UpdateHumanDto) {
    return this.humanService.update(+id, updateHumanDto);
  }

  @Delete(':id')
  softRemove(@Param('id') id: string) {
    return this.humanService.softDelete(+id);
  }

  @Patch('recover/:id')
  recover(@Param('id') id: string) {
    return this.humanService.recover(+id);
  }

  @Delete('hard/:id')
  hardRemove(@Param('id') id: string) {
    return this.humanService.hardDelete(+id);
  }
}
