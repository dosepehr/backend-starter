import { ApiProperty } from '@nestjs/swagger';
import { IsMobilePhone, IsString, Length, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: '09123456789' })
  @IsMobilePhone('fa-IR')
  mobile: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  otp: string;

  @ApiProperty({ example: 'NewPass123!' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
