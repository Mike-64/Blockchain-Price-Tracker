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
  @ApiOkResponse({ description: 'data as {chain, hourly prices[]}' })
  @ApiOperation({
    description: 'Gets the price data for last 24 hrs',
  })
  async getHourlyPrices(@Query('chain') chain: string) {
    return await this.trackerService.getHourlyPrices(chain);
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
}
