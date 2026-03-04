import { PartialType } from '@nestjs/swagger';
import { CreateHumanDto } from './create-human.dto';

export class UpdateHumanDto extends PartialType(CreateHumanDto) {}
