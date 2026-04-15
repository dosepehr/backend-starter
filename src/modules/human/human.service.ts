import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateHumanDto } from './dto/create-human.dto';
import { UpdateHumanDto } from './dto/update-human.dto';
import { Human } from './entities/human.entity';
import { FindOneOptions } from 'typeorm';
import { FilterService } from 'utils/common/filtering/filter.service';
import { FilterableField } from 'utils/interfaces/filterable-field.interface';
import { PaginationService } from 'utils/common/pagination/pagination.service';
import { PaginationDto } from 'utils/common/pagination/pagination.dto';
import { OrderingService } from 'utils/common/ordering/ordering.service';
import { SearchService } from 'utils/common/searching/search.service';
import { CacheService } from 'utils/cache/cache.service';
import { GlobalRepository } from 'utils/global/global.repository';

const HUMAN_FILTERABLE_FIELDS: FilterableField<Human>[] = [
  { field: 'name', type: 'string' },
  { field: 'age', type: 'number' },
  { field: 'deletedAt', type: 'date', nullable: true },
  { field: 'recoveredAt', type: 'date', nullable: true },
  { field: 'createdAt', type: 'date' },
  { field: 'updatedAt', type: 'date' },
];
const HUMAN_ORDERABLE_FIELDS = ['name', 'age', 'createdAt'];
const HUMAN_SEARCHABLE_FIELDS = ['name'];

const CACHE_TTL = 300;
const cacheKey = (id: number) => `human:${id}`;

@Injectable()
export class HumanService {
  constructor(
    @Inject('HumanRepository')
    private readonly humanRepository: GlobalRepository<Human>,
    private readonly filterService: FilterService,
    private readonly paginationService: PaginationService,
    private readonly orderingService: OrderingService,
    private readonly searchService: SearchService,
    private readonly cacheService: CacheService,
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
    if (options) {
      const human = await this.humanRepository.findOne({
        ...options,
        where: { id, ...options.where },
        relations: {
          profile: true,
          ...(options.relations ?? {}),
        },
      });
      if (!human) throw new NotFoundException(`Human with ID ${id} not found`);
      return human;
    }

    return this.cacheService.getOrSet<Human>(
      cacheKey(id),
      async () => {
        const human = await this.humanRepository.findOne({
          where: { id },
          relations: {
            profile: true,
          },
        });
        if (!human)
          throw new NotFoundException(`Human with ID ${id} not found`);
        return human;
      },
      CACHE_TTL,
    );
  }

  async update(id: number, updateHumanDto: UpdateHumanDto) {
    const human = await this.findOne(id);
    this.humanRepository.merge(human, updateHumanDto);
    const updated = await this.humanRepository.save(human);
    await this.cacheService.del(cacheKey(id));
    return updated;
  }

  async softDelete(id: number) {
    const human = await this.findOne(id, { withDeleted: true });

    if (human.deletedAt) {
      throw new BadRequestException(`Human with ID ${id} is already deleted.`);
    }

    await this.humanRepository.softRemove(human);
    await this.cacheService.del(cacheKey(id));
    return null;
  }

  async recover(id: number) {
    const human = await this.findOne(id, { withDeleted: true });

    if (!human.deletedAt) {
      throw new BadRequestException(
        `Human with ID ${id} is not deleted and cannot be recovered.`,
      );
    }

    await this.humanRepository.recover(human);

    await this.cacheService.del(cacheKey(id));
    return null;
  }

  async hardDelete(id: number) {
    const human = await this.findOne(id, { withDeleted: true });
    await this.humanRepository.remove(human);
    await this.cacheService.del(cacheKey(id));
    return null;
  }
  async updateAvatar(humanId: number, fileId: number): Promise<Human> {
    await this.humanRepository.update(humanId, { profileId: fileId });

    const human = await this.humanRepository.findOne({
      where: { id: humanId },
      withAudit: false,
    });

    if (!human) {
      throw new NotFoundException(`Human with ID ${humanId} not found`);
    }

    await this.cacheService.del(cacheKey(humanId));
    return human;
  }
}
