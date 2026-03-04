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
    const human = await this.humanRepository.findOne({ where: { id } });
    if (!human) {
      throw new NotFoundException(`Human with ID ${id} not found`);
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
    const { data: human } = await this.findOne(id);

    this.humanRepository.merge(human, updateHumanDto);
    const updatedHuman = await this.humanRepository.save(human);

    return {
      status: true,
      message: 'Human updated successfully',
      data: updatedHuman,
    };
  }

  async softDelete(id: number): Promise<SuccessResponse<void>> {
    const { data: humanToRemove } = await this.findOne(id); 
    
    await this.humanRepository.softRemove(humanToRemove);

    return {
      status: true,
      message: `Human with ID ${id} soft deleted successfully`,
    };
  }

  async hardDelete(id: number): Promise<SuccessResponse<void>> {
    const result = await this.humanRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(
        `Human with ID ${id} not found for hard delete`,
      );
    }

    return {
      status: true,
      message: `Human with ID ${id} hard deleted successfully`,
    };
  }

}
