import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication } from '@nestjs/common';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Server, ServerOptions } from 'socket.io';
import Redis from 'ioredis';

/**
 * Horizontally scales Socket.IO using Redis pub/sub. Use when running multiple API replicas
 * behind a load balancer; all nodes share room membership and broadcast.
 */
export class RedisIoAdapter extends IoAdapter {
  private pubClient: Redis;
  private subClient: Redis;

  constructor(
    app: INestApplication,
    private readonly redisUrl: string,
  ) {
    super(app);
    this.pubClient = new Redis(this.redisUrl, { maxRetriesPerRequest: null });
    this.subClient = this.pubClient.duplicate();
  }

  public override createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;
    server.adapter(createAdapter(this.pubClient, this.subClient));
    return server;
  }

  /** Release Redis handles on shutdown. */
  async disconnect(): Promise<void> {
    await Promise.all([this.pubClient.quit(), this.subClient.quit()]);
  }
}
