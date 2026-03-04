import { Injectable } from '@nestjs/common';
import { CreateHumanDto } from './dto/create-human.dto';
import { UpdateHumanDto } from './dto/update-human.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Human } from './entities/human.entity';
import { Repository } from 'typeorm';
import { SuccessResponse } from 'utils/interfaces/api-responses.interface';

@Injectable()
export class HumanService {
  constructor(
    @InjectRepository(Human)
    private readonly humanRepository: Repository<Human>,
  ) {}
  async create(
    createHumanDto: CreateHumanDto,
  ): Promise<SuccessResponse<Human>> {
    const human = this.humanRepository.create(createHumanDto);

    await this.humanRepository.save(human);
    return {
      status: true,
      message: 'human is created',
      data: human,
    };
  }

  findAll() {
    return `This action returns all human`;
  }

  findOne(id: number) {
    return `This action returns a #${id} human`;
  }

  update(id: number, updateHumanDto: UpdateHumanDto) {
    return `This action updates a #${id} human`;
  }

  remove(id: number) {
    return `This action removes a #${id} human`;
  }
}
