import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { TrackerService } from './tracker.service';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  // ApiProperty,
} from '@nestjs/swagger';
import { CreateAlertDto } from './dto/create-alert.dto';

@Controller('tracker')
export class TrackerController {
  constructor(private readonly trackerService: TrackerService) {}

  @Get('hourly-prices')
  @ApiOkResponse({ description: 'data as {hourly prices[]}' })
  @ApiOperation({
    description: 'Gets the price data for last 24 hrs',
  })
  async getHourlyPrices() {
    return await this.trackerService.getHourlyPrices();
  }

  @Post('set-alert')
  @ApiOperation({
    description: 'Create Alerts for notify when specific price reaches',
  })
  @ApiCreatedResponse({ description: 'data as {message, AlertData}' })
  async setAlert(@Body() alert: CreateAlertDto) {
    await this.trackerService.setAlert(
      alert.tokenName,
      alert.targetPrice,
      alert.email,
    );
    return { message: 'Alert set successfully.' };
  }
  @Get('swap-rate')
  @ApiOperation({
    description: 'Create Alerts for notify when specific price reaches',
  })
  @ApiOkResponse({ description: 'data as {message, AlertData}' })
  async getSwapRate(@Query('ethAmount') ethAmount: number) {
    if (!ethAmount || ethAmount <= 0) {
      return { error: 'Invalid ETH amount. Please provide a positive number.' };
    }
    return await this.trackerService.getSwapRate(ethAmount);
  }
}
