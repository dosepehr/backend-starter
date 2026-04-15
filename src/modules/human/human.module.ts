import { Module } from '@nestjs/common';
import { HumanService } from './human.service';
import { HumanController } from './human.controller';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';
import { Human } from './entities/human.entity';
import { FilterModule } from 'utils/common/filtering/filter.module';
import { PaginationModule } from 'utils/common/pagination/pagination.module';
import { OrderingModule } from 'utils/common/ordering/ordering.module';
import { SearchModule } from 'utils/common/searching/search.module';
import { DataSource } from 'typeorm';
import { GlobalRepository } from 'utils/global/global.repository';
import { FileModule } from '../file/file.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Human]),
    PaginationModule,
    FilterModule,
    OrderingModule,
    SearchModule,
    FileModule,
  ],
  controllers: [HumanController],
  providers: [
    {
      provide: 'HumanRepository',
      useFactory: (dataSource: DataSource) =>
        new GlobalRepository(Human, dataSource),
      inject: [getDataSourceToken()],
    },
    HumanService,
  ],
})
export class HumanModule {}
