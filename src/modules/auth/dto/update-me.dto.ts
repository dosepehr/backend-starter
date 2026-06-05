import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IsStrongPassword } from 'utils/decorators/is-strong-password.decorator';

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
  @IsStrongPassword()
  newPassword?: string;
}
