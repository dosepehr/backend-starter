import { IsEmail, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { IsStrongPassword } from 'utils/decorators/is-strong-password.decorator';
import { IsEqualTo } from 'utils/decorators/is-equal-to.decorator';

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

  @ValidateIf((o: UpdateMeDto) => !!o.newPassword)
  @IsString()
  @IsEqualTo('newPassword', { message: 'Passwords do not match' })
  rePassword?: string;
}
