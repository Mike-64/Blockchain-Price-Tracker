import { IsNumber, IsString, IsUUID } from 'class-validator';

export class CreateTrackerDto {
  @IsUUID()
  tokenName: string;

  @IsString()
  tokenSymbol: string;

  @IsString()
  templateJson: string;

  @IsNumber()
  usdPrice: number;

  @IsString()
  exchangeName: string;

  @IsString()
  tokenAddress: string;

  @IsString()
  tokenLogo: string;
}
