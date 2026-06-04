import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import { MobileDto } from './mobile.dto';

export class VerifyOtpLoginDto extends MobileDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  otp: string;
}
