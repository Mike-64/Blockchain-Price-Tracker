import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackerModule } from './tracker/tracker.module';
import { Price } from './tracker/entities/price.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { Alert } from './tracker/entities/alert.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ScheduleModule.forRoot(), ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DATABASE_HOST'),
        port: +configService.get<string>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASS'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [Price, Alert],
        synchronize: Boolean(configService.get<string>('DATABASE_SYN')),
      }),
    }),
    TrackerModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
