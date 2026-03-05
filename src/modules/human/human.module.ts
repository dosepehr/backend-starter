import { Module } from '@nestjs/common';
import { HumanService } from './human.service';
import { HumanController } from './human.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Human } from './entities/human.entity';
import { FilterModule } from 'utils/common/filter/filter.module';
import { PaginationModule } from 'utils/common/pagination/pagination.module';
import { OrderingModule } from 'utils/common/ordering/ordering.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Human]),
    PaginationModule,
    FilterModule,
    OrderingModule,
  ],
  controllers: [HumanController],
  providers: [HumanService],
})
export class HumanModule {}
