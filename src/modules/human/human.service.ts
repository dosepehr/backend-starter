import { Injectable, NotFoundException } from '@nestjs/common';
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
      message: 'Human is created',
      data: human,
    };
  }

  async findAll(): Promise<SuccessResponse<Human[]>> {
    const humans = await this.humanRepository.find();
    return {
      status: true,
      data: humans,
    };
  }

  async findOne(id: number) {
    const human = await this.humanRepository.findOne({
      where: {
        id,
      },
    });
    if (!human) {
      throw new NotFoundException();
    }

    return {
      status: true,
      data: human,
    };
  }

  async update(
    id: number,
    updateHumanDto: UpdateHumanDto,
  ): Promise<SuccessResponse<Human>> {
    const humanData = this.findOne(id);
    const human = (await humanData).data;
    Object.assign(human, updateHumanDto);
    await this.humanRepository.save(human);

    return {
      status: true,
      message: 'Human updated successfully',
      data: human,
    };
  }

  softDelete(id: number) {
    return `This action soft deletes a #${id} human`;
  }
  hardDelete(id: number) {
    return `This action hard deletes a #${id} human`;
  }
}
