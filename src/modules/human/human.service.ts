import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateHumanDto } from './dto/create-human.dto';
import { UpdateHumanDto } from './dto/update-human.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Human } from './entities/human.entity';
import { FindOneOptions, Repository } from 'typeorm';
import { FilterService } from 'utils/common/filtering/filter.service';
import { FilterableField } from 'utils/interfaces/filterable-field.interface';
import { PaginationService } from 'utils/common/pagination/pagination.service';
import { PaginationDto } from 'utils/common/pagination/pagination.dto';
import { OrderingService } from 'utils/common/ordering/ordering.service';
import { SearchService } from 'utils/common/searching/search.service';

const HUMAN_FILTERABLE_FIELDS: FilterableField<Human>[] = [
  { field: 'name', type: 'string' },
  { field: 'age', type: 'number' },
  { field: 'deletedAt', type: 'date', nullable: true },
  { field: 'recoveredAt', type: 'date', nullable: true },
  { field: 'createdAt', type: 'date' },
  { field: 'updatedAt', type: 'date' },
];
const HUMAN_ORDERABLE_FIELDS = ['name', 'age', 'createdAt'];
const HUMAN_SEARCHABLE_FIELDS = ['name', 'age'];

@Injectable()
export class HumanService {
  constructor(
    @InjectRepository(Human)
    private readonly humanRepository: Repository<Human>,
    private readonly filterService: FilterService,
    private readonly paginationService: PaginationService,
    private readonly orderingService: OrderingService,
    private readonly searchService: SearchService,
  ) {}

  async create(createHumanDto: CreateHumanDto) {
    const human = this.humanRepository.create(createHumanDto);
    return this.humanRepository.save(human);
  }

  async findAll(query: Record<string, string>, paginationDto: PaginationDto) {
    const { where: filterWhere, withDeleted } =
      this.filterService.buildQuery<Human>(query, HUMAN_FILTERABLE_FIELDS);

    const where = this.searchService.buildSearch<Human>(
      query.search,
      HUMAN_SEARCHABLE_FIELDS,
      filterWhere,
    );

    const order = this.orderingService.buildOrder<Human>(
      query.ordering,
      HUMAN_ORDERABLE_FIELDS,
    );

    return this.paginationService.paginate(
      this.humanRepository,
      paginationDto,
      { where, order, withDeleted },
    );
  }

  async findOne(id: number, options?: FindOneOptions<Human>) {
    const human = await this.humanRepository.findOne({
      where: { id },
      ...options,
    });
    if (!human) {
      throw new NotFoundException(`Human with ID ${id} not found`);
    }
    return human;
  }

  async update(id: number, updateHumanDto: UpdateHumanDto) {
    const human = await this.findOne(id);
    this.humanRepository.merge(human, updateHumanDto);
    return this.humanRepository.save(human);
  }

  async softDelete(id: number) {
    const human = await this.findOne(id);
    await this.humanRepository.softRemove(human);
    return null;
  }

  async recover(id: number) {
    const human = await this.findOne(id, { withDeleted: true });

    if (!human.deletedAt) {
      throw new NotFoundException(
        `Human with ID ${id} is not deleted and cannot be recovered.`,
      );
    }

    human.deletedAt = null;
    human.recoveredAt = new Date();
    await this.humanRepository.save(human);
    return null;
  }

  async hardDelete(id: number) {
    const result = await this.humanRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(
        `Human with ID ${id} not found for hard delete`,
      );
    }

    return null;
  }
}
