import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateHumanDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsNumber()
  age: number;
}
