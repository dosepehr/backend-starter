import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  oldPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  rePassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  newPassword?: string;
}
