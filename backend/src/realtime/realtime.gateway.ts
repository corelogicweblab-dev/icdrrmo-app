import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { UserRole } from '@prisma/client';
import { JwtPayload } from '../auth/types/jwt-payload.type';

const OPS_ROLES: ReadonlySet<UserRole> = new Set([
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.OPERATOR,
]);

@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: true, credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const raw = client.handshake.auth?.['token'];
      const token = typeof raw === 'string' ? raw.replace(/^Bearer\s+/i, '') : '';
      if (!token) {
        throw new UnauthorizedException('Missing token');
      }
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      client.data['user'] = payload;
      client.join(`user:${payload.sub}`);
      if (OPS_ROLES.has(payload.role)) {
        client.join('ops');
      }
      if (payload.role === UserRole.RESPONDER) {
        client.join('responders');
      }
      this.logger.log(`WS connected user=${payload.sub} role=${payload.role}`);
    } catch (e) {
      this.logger.warn(`WS rejected: ${e instanceof Error ? e.message : String(e)}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const user = client.data['user'] as JwtPayload | undefined;
    if (user) {
      this.logger.log(`WS disconnected user=${user.sub}`);
    }
  }

  emitIncidentCreated(payload: { incidentId: string; reporterId: string | null }): void {
    this.server.to('ops').emit('incident_created', payload);
    if (payload.reporterId) {
      this.server.to(`user:${payload.reporterId}`).emit('incident_created', payload);
    }
  }

  emitIncidentUpdated(payload: {
    incidentId: string;
    status?: string;
    reporterId?: string | null;
  }): void {
    this.server.to('ops').emit('incident_updated', payload);
    if (payload.reporterId) {
      this.server.to(`user:${payload.reporterId}`).emit('incident_updated', payload);
    }
  }

  emitResponderLocation(payload: { responderId: string; latitude: number; longitude: number }): void {
    this.server.to('ops').emit('responder_location_updated', payload);
  }

  emitUserLocation(payload: { userId: string; latitude: number; longitude: number }): void {
    this.server.to('ops').emit('user_location_updated', payload);
  }

  emitWeatherAlert(payload: { alertId: string; headline: string }): void {
    this.server.emit('weather_alert', payload);
  }

  emitEmergencyNotification(payload: { title: string; body: string }): void {
    this.server.emit('emergency_notification', payload);
  }

  emitIncidentClosed(payload: { incidentId: string }): void {
    this.server.to('ops').emit('incident_closed', payload);
  }
}
