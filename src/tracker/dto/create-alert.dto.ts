import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEmail } from 'class-validator';

export class CreateAlertDto {
  @IsString()
  @ApiProperty({
    description: 'Token',
    example: 'ethereum or polygon',
  })
  tokenName: string;

  @IsNumber()
  @ApiProperty({
    description: 'Target Price',
    example: '3000.21',
  })
  targetPrice: number;
  @IsEmail()
  @ApiProperty({
    description: 'email',
    example: 'doe@example.com',
  })
  email: string;
}
