import { Module } from '@nestjs/common';
import { HumanService } from './human.service';
import { HumanController } from './human.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Human } from './entities/human.entity';
import { FilterModule } from 'utils/common/filtering/filter.module';
import { PaginationModule } from 'utils/common/pagination/pagination.module';
import { OrderingModule } from 'utils/common/ordering/ordering.module';
import { SearchModule } from 'utils/common/searching/search.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Human]),
    PaginationModule,
    FilterModule,
    OrderingModule,
    SearchModule,
  ],
  controllers: [HumanController],
  providers: [HumanService],
})
export class HumanModule {}
