import { Injectable, Logger } from '@nestjs/common';
import { sendEmail } from 'src/utils/email.utils';
import { Cron } from '@nestjs/schedule';
import Moralis from 'moralis';
import { ConfigService } from '@nestjs/config';
import { Price } from './entities/price.entity';
import { MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Alert } from './entities/alert.entity';

@Injectable()
export class TrackerService {
  private readonly logger = new Logger(TrackerService.name);

  constructor(
    @InjectRepository(Price)
    private readonly priceRepository: Repository<Price>,
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Connecting to Moralis');
    await Moralis.start({
      apiKey: this.configService.get('API_KEY'),
    });
    this.logger.log('Done !!');
  }

  private async fetchPrice(token: string): Promise<number> {
    const address =
      token === 'ethereum'
        ? this.configService.get<string>('ethereum')
        : this.configService.get<string>('polygon');

    this.logger.log(`Fetching ${token} Price`);
    //Fetching Token price from Moralis API
    const response = await Moralis.EvmApi.token.getTokenPrice({
      chain: '0x1',
      address: address,
    });
    return response.result.usdPrice;
  }
  async trackPrices(): Promise<void> {
    const tokens = ['ethereum', 'polygon'];

    for (const token of tokens) {
      const price = await this.fetchPrice(token);
      this.logger.log('Saving Price Data to store');
      await this.priceRepository.save({ token, price }); //Saving Price data into DB

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentPrices = await this.priceRepository.find({
        where: { token, timestamp: MoreThan(oneHourAgo) },
        order: { timestamp: 'DESC' },
      });

      if (recentPrices.length > 0) {
        const latestPrice = recentPrices[0].price;
        const change = ((price - latestPrice) / latestPrice) * 100;
        //Checking if the price increased more than 3%
        if (change > 3) {
          this.logger.log('Sending Email Alert');
          await sendEmail(
            'hyperhire_assignment@hyperhire.in',
            `${token.toUpperCase()} Price Alert`,
            `The price of ${token} has increased by more than 3% in the last hour.`,
          );
        }
      }
    }
  }

  async checkAlerts(): Promise<void> {
    const alerts = await this.alertRepository.find();

    for (const alert of alerts) {
      const currentPrice = await this.fetchPrice(alert.token);
      this.logger.log('Checked for Target Price');
      if (currentPrice >= alert.targetPrice) {
        this.logger.log(`Sent Email Alert for ${alert}`);
        await sendEmail(
          alert.email,
          `${alert.token.toUpperCase()} Alert`,
          `The price of ${alert.token} has reached your target price $${alert.targetPrice}. The current price is $${currentPrice.toPrecision(2)}`,
        );

        await this.alertRepository.delete(alert.id);
      }
    }
  }

  async getHourlyPrices(token: string): Promise<Price[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return await this.priceRepository.find({
      where: { token, timestamp: MoreThan(oneDayAgo) },
      order: { timestamp: 'ASC' },
    });
  }

  async setAlert(
    token: string,
    targetPrice: number,
    email: string,
  ): Promise<void> {
    await this.alertRepository.save({ token, targetPrice, email });
  }

  @Cron('*/5 * * * *')
  async handleCron() {
    await this.trackPrices();
    await this.checkAlerts();
  }
}
