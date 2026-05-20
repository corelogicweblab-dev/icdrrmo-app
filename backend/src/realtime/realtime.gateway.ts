import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { UserRole } from '@prisma/client';
import { JwtPayload } from '../auth/types/jwt-payload.type';
import { PrismaService } from '../prisma/prisma.service';

const OPS_ROLES: ReadonlySet<UserRole> = new Set([
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.OPERATOR,
]);

const CHAIRMAN_ROLES: ReadonlySet<UserRole> = new Set([UserRole.BARANGAY_CHAIRMAN]);

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
    private readonly prisma: PrismaService,
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
      if (CHAIRMAN_ROLES.has(payload.role)) {
        client.join('chairman');
        const profile = await this.prisma.userProfile.findUnique({
          where: { userId: payload.sub },
          select: { barangayId: true },
        });
        if (profile?.barangayId) {
          client.join(`chairman:${profile.barangayId}`);
        }
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

  private voiceRoom(incidentId: string): string {
    return `voice:${incidentId}`;
  }

  private async assertVoiceRoomAccess(
    user: JwtPayload,
    incidentId: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const incident = await this.prisma.incident.findUnique({
      where: { id: incidentId },
      select: { reporterId: true },
    });
    if (!incident) {
      return { ok: false, error: 'incident not found' };
    }
    const isOps = OPS_ROLES.has(user.role);
    const isReporter = incident.reporterId != null && incident.reporterId === user.sub;
    if (!isOps && !isReporter) {
      return { ok: false, error: 'forbidden' };
    }
    return { ok: true };
  }

  @SubscribeMessage('voice_join')
  async onVoiceJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { incidentId?: string },
  ): Promise<{ ok: boolean; error?: string; peersAlreadyPresent?: number }> {
    const incidentId = typeof body?.incidentId === 'string' ? body.incidentId.trim() : '';
    if (!incidentId) {
      return { ok: false, error: 'incidentId required' };
    }
    const user = client.data['user'] as JwtPayload | undefined;
    if (!user) {
      return { ok: false, error: 'unauthorized' };
    }
    const gate = await this.assertVoiceRoomAccess(user, incidentId);
    if (!gate.ok) {
      return { ok: false, error: gate.error };
    }
    const room = this.voiceRoom(incidentId);
    const before = await this.server.in(room).fetchSockets();
    const peersAlreadyPresent = before.filter((s) => s.id !== client.id).length;
    await client.join(room);
    if (!OPS_ROLES.has(user.role)) {
      this.server.to('ops').emit('voice_incident_ring', {
        incidentId,
        reporterId: user.sub,
        at: new Date().toISOString(),
      });
    }
    client.to(room).emit('voice_peer_joined', {
      incidentId,
      userId: user.sub,
      role: OPS_ROLES.has(user.role) ? 'ops' : 'citizen',
    });
    this.logger.log(`voice_join incident=${incidentId} user=${user.sub} peersAlready=${peersAlreadyPresent}`);
    return { ok: true, peersAlreadyPresent };
  }

  @SubscribeMessage('voice_leave')
  async onVoiceLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { incidentId?: string },
  ): Promise<{ ok: boolean; error?: string }> {
    const incidentId = typeof body?.incidentId === 'string' ? body.incidentId.trim() : '';
    if (!incidentId) {
      return { ok: false, error: 'incidentId required' };
    }
    await client.leave(this.voiceRoom(incidentId));
    return { ok: true };
  }

  @SubscribeMessage('voice_signal')
  onVoiceSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: {
      incidentId?: string;
      type?: string;
      sdp?: Record<string, unknown>;
      candidate?: Record<string, unknown>;
    },
  ): { ok: boolean; error?: string } {
    const incidentId = typeof body?.incidentId === 'string' ? body.incidentId.trim() : '';
    const type = typeof body?.type === 'string' ? body.type : '';
    if (!incidentId || !['offer', 'answer', 'candidate'].includes(type)) {
      return { ok: false, error: 'bad payload' };
    }
    const room = this.voiceRoom(incidentId);
    if (!client.rooms.has(room)) {
      return { ok: false, error: 'not in voice room' };
    }
    client.to(room).emit('voice_signal', {
      incidentId,
      type,
      sdp: body.sdp,
      candidate: body.candidate,
    });
    return { ok: true };
  }

  emitIncidentCreated(payload: {
    incidentId: string;
    reporterId: string | null;
    latitude?: number | null;
    longitude?: number | null;
    type?: string;
    title?: string | null;
    barangayId?: string | null;
  }): void {
    this.server.to('ops').emit('incident_created', payload);
    this.server.to('chairman').emit('chairman_incident', {
      ...payload,
      feedStatus: 'new',
    });
    if (payload.barangayId) {
      this.server.to(`chairman:${payload.barangayId}`).emit('chairman_incident', {
        ...payload,
        feedStatus: 'new',
        alarm: true,
      });
    }
    if (payload.reporterId) {
      this.server.to(`user:${payload.reporterId}`).emit('incident_created', payload);
    }
  }

  emitChairmanIncident(payload: {
    barangayId: string;
    incidentId: string;
    status: string;
    feedStatus: string;
  }): void {
    this.server.to(`chairman:${payload.barangayId}`).emit('chairman_incident', payload);
    this.server.to('chairman').emit('chairman_incident', payload);
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
