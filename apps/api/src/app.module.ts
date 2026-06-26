import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule, CsrfGuard, JwtAuthGuard, RolesGuard } from './auth';
import { UsersModule } from './users';
import { ListingsModule } from './listings';
import { ListingDocumentsModule } from './listing-documents';
import { TransactionsModule } from './transactions';
import { ClientsModule } from './clients';
import { AppointmentsModule } from './appointments';
import { DashboardModule } from './dashboard';
import { ReportsModule } from './reports';
import { SearchModule } from './search';
import { NotificationsModule } from './notifications';
import { AnalyticsModule } from './analytics';
import { PublicLeadsModule } from './public-leads';
import { PublicListingSubmissionsModule } from './public-listing-submissions';
import { LocationsModule } from './locations';
import { ProductFeedbackModule } from './product-feedback';
import { BlogModule } from './blog';
import { AdminModule } from './admin';
import { PlansModule } from './plans';
import { BillingModule } from './billing';
import { TasksModule } from './tasks/tasks.module';
import { MessageTemplatesModule } from './message-templates';
import { MatchingModule } from './matching';

function getBooleanConfig(
  configService: ConfigService,
  key: string,
  defaultValue = false,
) {
  const value = configService.get<string>(key);
  if (value === undefined) return defaultValue;

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get('DB_USERNAME', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: configService.get('DB_NAME', 'real_estate_saas'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: getBooleanConfig(configService, 'TYPEORM_SYNCHRONIZE'),
        logging: configService.get('NODE_ENV') !== 'production',
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }]),
    AuthModule,
    UsersModule,
    ListingsModule,
    ListingDocumentsModule,
    TransactionsModule,
    ClientsModule,
    AppointmentsModule,
    DashboardModule,
    TasksModule,
    MessageTemplatesModule,
    MatchingModule,
    ReportsModule,
    SearchModule,
    NotificationsModule,
    AnalyticsModule,
    LocationsModule,
    PublicLeadsModule,
    PublicListingSubmissionsModule,
    ProductFeedbackModule,
    BlogModule,
    PlansModule,
    BillingModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
