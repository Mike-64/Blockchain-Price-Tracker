import { Injectable, Logger } from '@nestjs/common';
import { transporter as mailer } from 'src/utils/email.utils';
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
  private readonly chain = '0x1';

  async onModuleInit() {
    this.logger.log('Connecting to Moralis');
    await Moralis.start({
      apiKey: this.configService.get('API_KEY'),
    });
    this.logger.log('Done !!');
  }

  constructor(
    @InjectRepository(Price)
    private readonly priceRepository: Repository<Price>,
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
    private readonly configService: ConfigService,
  ) {}

  private async fetchPrice(token: string): Promise<number> {
    const address =
      token === 'ethereum'
        ? this.configService.get<string>('ethereum')
        : this.configService.get<string>('polygon');

    this.logger.log(`Fetching ${token} Price`);
    //Fetching Token price from Moralis API
    const response = await Moralis.EvmApi.token.getTokenPrice({
      chain: this.chain,
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
          await mailer.sendMail({
            from: process.env.EMAIL_USER,
            to: 'hyperhire_assignment@hyperhire.in',
            subject: `${token.toUpperCase()} Price Alert`,
            text: `The price of ${token} has increased by more than 3% in the last hour.`,
          });
        }
      }
    }
  }

  // Check if the current price of a token has reached the target price set by the user
  async checkAlerts(): Promise<void> {
    const alerts = await this.alertRepository.find();
    // Check if the current price of the token has reached the target price
    for (const alert of alerts) {
      const currentPrice = await this.fetchPrice(alert.token);
      this.logger.log('Checked for Target Price');
      if (currentPrice >= alert.targetPrice) {
        this.logger.log(`Sent Email Alert for ${alert}`);
        // Send an email to the user

        await mailer.sendMail({
          from: process.env.EMAIL_USER,
          to: alert.email,
          subject: `${alert.token.toUpperCase()} Alert`,
          text: `The price of ${alert.token} has reached your target price $${alert.targetPrice}. The current price is $${currentPrice.toPrecision(2)}`,
        });

        // Delete the alert from the database
        await this.alertRepository.delete(alert.id);
      }
    }
  }

  // Fetch the hourly prices of Ethereum and Polygon tokens
  async getHourlyPrices(): Promise<Price[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return await this.priceRepository.find({
      where: { timestamp: MoreThan(oneDayAgo) },
      order: { timestamp: 'ASC' },
    });
  }

  // Set an alert for a specific token
  async setAlert(
    token: string,
    targetPrice: number,
    email: string,
  ): Promise<void> {
    await this.alertRepository.save({ token, targetPrice, email });
  }

  async getSwapRate(ethAmount: number): Promise<any> {
    try {
      // Fetch the contract addresses of wBTC and wETH tokens
      const wBTCResponse = await Moralis.EvmApi.token.getTokenMetadata({
        addresses: ['0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'],
        chain: this.chain,
      });
      // Fetch the contract addresses of wBTC and wETH tokens
      const wETHResponse = await Moralis.EvmApi.token.getTokenMetadata({
        addresses: ['0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'],
        chain: this.chain,
      });
      const wBTCAddress = wBTCResponse.result[0].token.contractAddress;
      const wETHAddress = wETHResponse.result[0].token.contractAddress;

      // Fetch the current prices of ETH and BTC
      const tokenPrices = await Moralis.EvmApi.token.getMultipleTokenPrices(
        {
          chain: this.chain,
        },
        {
          tokens: [
            { tokenAddress: wETHAddress },
            { tokenAddress: wBTCAddress },
          ],
        },
      );
      const ethPriceInUsd = tokenPrices.result[0].usdPrice;
      const btcPriceInUsd = tokenPrices.result[1].usdPrice;

      // Calculate swap rate
      const ethValueInUsd = ethAmount * ethPriceInUsd;
      const btcAmount = ethValueInUsd / btcPriceInUsd;

      // Calculate fees
      const feePercentage = 0.03; // 3%
      const feeInEth = ethAmount * feePercentage;
      const feeInUsd = ethValueInUsd * feePercentage;

      return {
        btcAmount: btcAmount.toFixed(8), // Limit to 8 decimal places for BTC precision
        fees: {
          inEth: feeInEth.toFixed(8),
          inUsd: feeInUsd.toFixed(2),
        },
      };
    } catch (error) {
      console.error('Error fetching swap rate:', error.message);
      throw new Error('Failed to fetch swap rate. Please try again later.');
    }
  }

  @Cron('*/1 * * * *')
  async handleCron() {
    await this.trackPrices();
    await this.checkAlerts();
  }
}
