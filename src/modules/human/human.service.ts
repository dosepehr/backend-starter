import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateHumanDto } from './dto/create-human.dto';
import { UpdateHumanDto } from './dto/update-human.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Human } from './entities/human.entity';
import { FindOneOptions, Repository } from 'typeorm';
import { SuccessResponse } from 'utils/interfaces/api-responses.interface';
import { FilterService } from 'utils/services/filter/filter.service';
import { FilterableField } from 'utils/interfaces/filterable-field.interface';

const HUMAN_FILTERABLE_FIELDS: FilterableField<Human>[] = [
  { field: 'name', type: 'string' },
  { field: 'age', type: 'number' },
  { field: 'deletedAt', type: 'date', nullable: true },
  { field: 'recoveredAt', type: 'date', nullable: true },
  { field: 'createdAt', type: 'date' },
  { field: 'updatedAt', type: 'date' },
];

@Injectable()
export class HumanService {
  constructor(
    @InjectRepository(Human)
    private readonly humanRepository: Repository<Human>,
    private readonly filterService: FilterService,
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

  async findAll(
    query: Record<string, string>,
  ): Promise<SuccessResponse<Human[]>> {
    const options = this.filterService.buildQuery<Human>(
      query,
      HUMAN_FILTERABLE_FIELDS,
    );

    const humans = await this.humanRepository.find(options);
    return {
      status: true,
      data: humans,
    };
  }
  async findOne(id: number, options?: FindOneOptions<Human>) {
    const human = await this.humanRepository.findOne({
      where: { id },
      ...options,
    });
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

  async recover(id: number): Promise<SuccessResponse<void>> {
    const { data: human } = await this.findOne(id, { withDeleted: true });

    if (!human.deletedAt) {
      throw new NotFoundException(
        `Human with ID ${id} is not deleted and cannot be recovered.`,
      );
    }
    human.deletedAt = null;
    human.recoveredAt = new Date();

    await this.humanRepository.save(human);

    return {
      status: true,
      message: `Human with ID ${id} recovered successfully`,
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
