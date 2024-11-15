import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from 'src/email/email.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import Moralis from 'moralis';
import { ConfigService } from '@nestjs/config';
import { TokenRepository } from './entities/token.repository';
import { Token } from './entities/token.entity';
import { Between, MoreThanOrEqual, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Alert } from './entities/alert.entity';
import { CreateAlertDto } from './dto/create-alert.dto';

@Injectable()
export class TrackerService {
  private readonly logger = new Logger(TrackerService.name);

  constructor(
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly tokenRepository: TokenRepository,
  ) {}

  async onApplicationBootstrap() {
    await Moralis.start({
      apiKey: this.configService.get('API_KEY'),
    });
  }
  // Sample function to fetch prices from an API
  private async fetchData(
    chain: string,
    tokenContract: string,
  ): Promise<Token> {
    // Call the API (use Moralis or Solscan API here)
    let tokenData;
    try {
      const response = await Moralis.EvmApi.token.getTokenPrice({
        chain: this.configService.get(chain),
        address: tokenContract,
      });
      tokenData = response.raw;
      this.logger.log(response.toJSON().tokenSymbol);
    } catch (e) {
      console.error(e);
    }
    //Return the TokenData
    return tokenData;
  }

  // Store prices every 5 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async savePrices() {
    this.logger.log('Saving Token Price');
    const ethereumData = await this.fetchData(
      'eth',
      this.configService.get('ethereum'),
    );
    const polygonData = await this.fetchData(
      'eth',
      this.configService.get('matic'),
    );

    // Store in database
    this.tokenRepository.insert(ethereumData);
    this.tokenRepository.insert(polygonData);
    this.logger.log(
      `Stored prices - Ethereum: ${ethereumData}, Polygon: ${polygonData}`,
    );
  }

  // Check if price change is more than 3% and send emails if so
  @Cron(CronExpression.EVERY_HOUR)
  async checkPriceChange() {
    this.logger.log('Checking Price Change');
    const ethereumPrice = await this.fetchData(
      'eth',
      this.configService.get('ethereum'),
    );
    const polygonPrice = await this.fetchData(
      'eth',
      this.configService.get('matic'),
    );
    const oneHrAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.logger.log(oneHrAgo);
    // Fetch latest price data from the database
    const dbPriceEthereum = await this.tokenRepository.findOne({
      where: { tokenSymbol: 'WETH', createdDate: MoreThanOrEqual(oneHrAgo) },
      order: { createdDate: { direction: 'DESC' } },
    });
    const dbPricePolygon = await this.tokenRepository.findOne({
      where: { tokenSymbol: 'MATIC', createdDate: MoreThanOrEqual(oneHrAgo) },
      order: { createdDate: { direction: 'DESC' } },
    });

    //send alert if Price increases by 3%
    if (
      Number(ethereumPrice.usdPrice) -
        Number(dbPriceEthereum.usdPrice) / Number(dbPriceEthereum.usdPrice) >
      0.03
    ) {
      this.logger.log('Sending Price Alert for Ethereum');
      await this.emailService.sendPriceAlert(
        'hyperhire_assignment@hyperhire.in',
        'Ethereum Price Alert',
        `Ethereum price increased by more than 3%: ${ethereumPrice}`,
      );
    }

    if (
      (Number(polygonPrice) - Number(dbPricePolygon)) / Number(dbPricePolygon) >
      0.03
    ) {
      this.logger.log('Sending Price Alert for Polygon');
      await this.emailService.sendPriceAlert(
        'hyperhire_assignment@hyperhire.in',
        'Polygon Price Alert',
        `Polygon price increased by more than 3%: ${polygonPrice}`,
      );
    }
  }

  async getPricesForLast24Hours(): Promise<
    { chain: string; hourlyPrices: { timestamp: string; price: number }[] }[]
  > {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    this.logger.log('Fetching Price Data from store');
    const ethereumPrices = await this.tokenRepository.find({
      where: {
        tokenSymbol: 'WETH',
        createdDate: Between(twentyFourHoursAgo, now),
      },
      order: { createdDate: 'ASC' },
    });

    const polygonPrices = await this.tokenRepository.find({
      where: {
        tokenSymbol: 'MATIC',
        createdDate: Between(twentyFourHoursAgo, now),
      },
      order: { createdDate: 'ASC' },
    });

    const groupedByHour = new Map<number, Token>();
    ethereumPrices.forEach((token) => {
      const hourKey = new Date(token.createdDate).getHours();
      if (!groupedByHour.has(hourKey)) {
        groupedByHour.set(hourKey, token);
      }
    });
    const groupedByHourPoly = new Map<number, Token>();
    polygonPrices.forEach((token) => {
      const hourKey = new Date(token.createdDate).getHours();
      if (!groupedByHourPoly.has(hourKey)) {
        groupedByHourPoly.set(hourKey, token);
      }
    });

    this.logger.log('Sending Data in Reponse');

    return [
      {
        chain: 'ethereum',
        hourlyPrices: Array.from(groupedByHour.values()).map((price) => ({
          timestamp: price.createdDate.toLocaleString(),
          price: Number(price.usdPrice),
        })),
      },
      {
        chain: 'polygon',
        hourlyPrices: Array.from(groupedByHourPoly.values()).map((price) => ({
          timestamp: price.createdDate.toLocaleString(),
          price: Number(price.usdPrice),
        })),
      },
    ];
  }

  async createAlert(createAlertDto: CreateAlertDto): Promise<Alert> {
    const alert = this.alertRepository.create(createAlertDto);
    this.logger.log(
      `Alert for ${createAlertDto.email} on ${createAlertDto.tokenName}has been created`,
    );
    return await this.alertRepository.save(alert);
  }

  private async getActiveAlerts(): Promise<Alert[]> {
    return await this.alertRepository.find({ where: { status: 'Active' } });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async checkForAlerts() {
    const activeAlerts = await this.getActiveAlerts();
    this.logger.log('Responding to active alerts');
    const ethereumPrice = await this.fetchData(
      'eth',
      this.configService.get('ethereum'),
    );
    const polygonPrice = await this.fetchData(
      'eth',
      this.configService.get('matic'),
    );

    for (const alert of activeAlerts) {
      if (
        (alert.chain === 'ethereum' &&
          Number(ethereumPrice.usdPrice) >= alert.dollar) ||
        (alert.chain === 'polygon' &&
          Number(polygonPrice.usdPrice) >= alert.dollar)
      ) {
        await this.emailService.sendPriceAlert(
          alert.email,
          `Price Alert for ${alert.chain}`,
          `The price of ${alert.chain} has reached $${alert.dollar}!`,
        );
        alert.status = 'Done';
        this.alertRepository.save(alert);
      }
    }
  }
}
