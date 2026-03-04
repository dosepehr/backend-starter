import { Module } from '@nestjs/common';
import { HumanService } from './human.service';
import { HumanController } from './human.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Human } from './entities/human.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Human])],
  controllers: [HumanController],
  providers: [HumanService],
})
export class HumanModule {}
