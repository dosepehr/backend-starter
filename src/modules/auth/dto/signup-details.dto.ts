import { IsString, IsNotEmpty, MinLength, Matches } from 'class-validator';
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
  @MinLength(3)
  name: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
