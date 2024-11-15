import { Module } from '@nestjs/common';
import { TrackerService } from './tracker.service';
import { TrackerController } from './tracker.controller';
import { EmailService } from 'src/email/email.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenRepository } from './entities/token.repository';
import { Token } from './entities/token.entity';
import { Alert } from './entities/alert.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Token, Alert])],
  controllers: [TrackerController],
  providers: [TrackerService, EmailService, TokenRepository],
})
export class TrackerModule {}
