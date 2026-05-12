import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { RealtimeModule } from './realtime/realtime.module';
import { IncidentsModule } from './incidents/incidents.module';
import { SmsModule } from './sms/sms.module';
import { WeatherModule } from './weather/weather.module';
import { JobsModule } from './jobs/jobs.module';
import { AuditModule } from './audit/audit.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { RespondersModule } from './responders/responders.module';
import { BarangaysModule } from './barangays/barangays.module';
import { EvacuationCentersModule } from './evacuation-centers/evacuation-centers.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { MapModule } from './map/map.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AlertsModule } from './alerts/alerts.module';
import { SystemModule } from './system/system.module';
import { FirestoreModule } from './firestore/firestore.module';
import { RtcModule } from './rtc/rtc.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    FirestoreModule,
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 120 }],
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    RealtimeModule,
    IncidentsModule,
    SmsModule,
    WeatherModule,
    HealthModule,
    JobsModule,
    UsersModule,
    VehiclesModule,
    RespondersModule,
    BarangaysModule,
    EvacuationCentersModule,
    NotificationsModule,
    AuditLogsModule,
    MapModule,
    DashboardModule,
    AlertsModule,
    SystemModule,
    RtcModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
