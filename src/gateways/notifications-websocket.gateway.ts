// ============================================================================
// WEBSOCKET GATEWAY
// ============================================================================
import { Logger, OnModuleInit } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { NotificationsService } from '../services/notification.service';
import { Unsubscribe } from '@synq/notifications-core';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/notifications'
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  private readonly logger = new Logger(NotificationsGateway.name);
  private clientSubscriptions = new Map<string, Unsubscribe[]>();
  private userToClients = new Map<string, Set<string>>(); // userId -> Set of socket.ids

  @WebSocketServer()
  server!: Server;

  constructor(private readonly notificationsService: NotificationsService) { }

  onModuleInit() {
    // This is the KEY fix - Subscribe to ALL notifications globally
    // and broadcast to connected clients for that user
    this.notificationsService.subscribe('*', (notification) => {
      this.broadcastToUser(notification.userId, 'notification', {
        type: 'notification',
        notification
      });
    });

    // Subscribe to unread count changes for all users
    this.notificationsService.onUnreadCountChange('*', (count, userId) => {
      this.broadcastToUser(userId, 'unread-count', {
        type: 'unread-count',
        count
      });
    });

    this.logger.log('WebSocket gateway initialized with global subscriptions');
  }

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;

    if (!userId) {
      this.logger.warn('Client connected without userId');
      client.disconnect();
      return;
    }

    this.logger.log(`Client connected: ${client.id} (userId: ${userId})`);

    // Track this client for this user
    if (!this.userToClients.has(userId)) {
      this.userToClients.set(userId, new Set());
    }
    this.userToClients.get(userId)!.add(client.id);

    // Store userId on socket for easy access
    (client as any).userId = userId;

    // Send initial data
    this.sendInitialData(client, userId);
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId;
    this.logger.log(`Client disconnected: ${client.id} (userId: ${userId})`);

    // Remove client from user's client list
    if (userId) {
      const clients = this.userToClients.get(userId);
      if (clients) {
        clients.delete(client.id);
        if (clients.size === 0) {
          this.userToClients.delete(userId);
        }
      }
    }
  }

  private broadcastToUser(userId: string, event: string, data: any) {
    const clientIds = this.userToClients.get(userId);
    if (!clientIds || clientIds.size === 0) return;

    // Broadcast to all connected clients for this user
    clientIds.forEach(clientId => {
      const socket = this.server.sockets.sockets.get(clientId);
      if (socket) {
        socket.emit(event, data);
      }
    });
  }

  @SubscribeMessage('mark-as-read')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: string }
  ) {
    await this.notificationsService.markAsRead(data.notificationId);
    return { success: true };
  }

  @SubscribeMessage('mark-all-read')
  async handleMarkAllAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string }
  ) {
    await this.notificationsService.markAllAsRead(data.userId);
    return { success: true };
  }

  @SubscribeMessage('delete')
  async handleDelete(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: string }
  ) {
    await this.notificationsService.delete(data.notificationId);
    return { success: true };
  }

  private async sendInitialData(client: Socket, userId: string) {
    try {
      const [notifications, unreadCount] = await Promise.all([
        this.notificationsService.getForUser(userId, { limit: 20 }),
        this.notificationsService.getUnreadCount(userId)
      ]);

      client.emit('initial-data', {
        notifications,
        unreadCount
      });
    } catch (error) {
      this.logger.error('Failed to send initial data', error);
    }
  }
}
