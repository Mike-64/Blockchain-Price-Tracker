import { Body, Controller, Get, Post } from '@nestjs/common';
import { TrackerService } from './tracker.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';

@Controller('tracker')
export class TrackerController {
  constructor(private readonly trackerService: TrackerService) {}

  @Get('PriceForLast24Hrs')
  @ApiOkResponse({ description: 'data as {chain, hourly prices[]}' })
  @ApiOperation({
    description: 'Gets the price data for last 24 hrs',
  })
  getPrice24Hrs() {
    return this.trackerService.getPricesForLast24Hours();
  }

  @Post('SetAlert')
  @ApiOperation({
    description: 'create Alerts for notify when specific price reaches',
  })
  @ApiCreatedResponse({ description: 'data as {message, AlertData}' })
  async setAlert(@Body() createAlertDto: CreateAlertDto) {
    const alert = await this.trackerService.createAlert(createAlertDto);
    return {
      message: 'Alert successfully created!',
      alert,
    };
  }
}
