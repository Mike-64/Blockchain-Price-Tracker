import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('EMAIL_HOST'),
      service: this.configService.get('EMAIL_SERVICE'),
      port: this.configService.get('EMAIL_PORT'),
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_PASS'),
      },
    });
  }

  async sendPriceAlert(to: string, subject: string, text: string) {
    await this.transporter.sendMail({
      from: `"Blockchain Tracker" ${this.configService.get('EMAIL_USER')}`, // sender address
      to,
      subject,
      text,
    });
  }
}
