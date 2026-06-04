import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, MinLength } from 'class-validator';
import { MobileDto } from './mobile.dto';

export class ResetPasswordDto extends MobileDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  otp: string;

  @ApiProperty({ example: 'NewPass123!' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
