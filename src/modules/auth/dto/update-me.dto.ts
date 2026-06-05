import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { IsStrongPassword } from 'utils/decorators/is-strong-password.decorator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  name?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  oldPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  @IsStrongPassword()
  newPassword?: string;
}
