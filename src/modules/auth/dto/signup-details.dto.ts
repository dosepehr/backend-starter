import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDetailsDto {
  @ApiProperty({ example: '09123456789' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^09\d{9}$/, { message: 'Invalid mobile number format' })
  mobile: string;

  @ApiProperty({ example: 'john_doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @IsNotEmpty()
  @Length(8, 100, { message: 'Password must be at least 8 characters' })
  password: string;
}
