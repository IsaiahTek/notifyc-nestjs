import { Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
} from '@nestjs/websockets';
import { NotificationsService } from '../services/notification.service';
import { getNotificationsServiceInstance } from '../module';
import { Unsubscribe } from '@synq/notifications-core';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/notifications'
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, OnModuleInit {
  private readonly logger = new Logger(NotificationsGateway.name);
  private userToClients = new Map<string, Set<string>>(); 
  private notificationsService!: NotificationsService;

  @WebSocketServer()
  server!: Server;

  constructor() {
    this.logger.log('NotificationsGateway: Constructor called (no dependencies)');
  }

  afterInit(server: Server) {
    this.logger.log('🚀 WebSocket server initialized (afterInit hook)');
    this.logger.log(`🚀 Server instance available: ${!!server}`);
    this.logger.log(`🚀 Server.sockets available: ${!!server?.sockets}`);
    this.logger.log(`🚀 this.server available: ${!!this.server}`);
    
    // Force set the server if needed
    if (server && !this.server) {
      this.server = server;
      this.logger.log('🚀 Server manually assigned');
    }
  }

  onModuleInit() {
    this.logger.log('WebSocket gateway initialization start.');

    // Get the service instance from the global singleton
    this.notificationsService = getNotificationsServiceInstance();
    this.logger.log('✅ NotificationsService retrieved from singleton');

    // 1. Subscribe to the Service's internal event emitter for immediate broadcasts.
    this.notificationsService.onNotificationSent((notification) => {
      this.logger.verbose(`Local Emitter triggered for new notification: ${notification.id} (User: ${notification.userId})`);
      this.broadcastToUser(notification.userId, 'notification', {
        type: 'notification',
        notification
      });
    });

    // 2. Subscribe to unread count changes for all users
    this.notificationsService.onUnreadCountChange('*', (count, userId) => {
      this.logger.verbose(`Unread count changed for user ${userId}: ${count}`);
      this.broadcastToUser(userId, 'unread-count', {
        type: 'unread-count',
        count
      });
    });

    this.logger.log('WebSocket gateway initialized with event listeners.');
  }

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;

    if (!userId) {
      this.logger.warn(`Client connected from ${client.handshake.address} without userId. Disconnecting.`);
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

    // Send initial data immediately upon connection
    this.sendInitialData(client, userId);
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId;
    if (!userId) return;

    this.logger.log(`Client disconnected: ${client.id} (userId: ${userId})`);

    // Remove client from user's client list
    const clients = this.userToClients.get(userId);
    if (clients) {
      clients.delete(client.id);
      if (clients.size === 0) {
        this.userToClients.delete(userId);
      }
    }
  }

  private broadcastToUser(userId: string, event: string, data: any) {
    if (!this.server) {
      this.logger.error('WebSocket server not initialized. Skipping broadcast.');
      return;
    }

    const clientIds = this.userToClients.get(userId);
    if (!clientIds || clientIds.size === 0) {
      this.logger.verbose(`No active clients found for user ${userId}. Skipping broadcast.`);
      return;
    }

    this.logger.log(`Broadcasting ${event} to ${clientIds.size} client(s) for user ${userId}`);

    // Use the namespace's sockets collection to emit to specific clients
    clientIds.forEach(clientId => {
      const socket = (this.server.sockets as any).get(clientId);

      if (socket) {
        socket.emit(event, data);
        this.logger.verbose(`✅ SENT ${event} to client: ${clientId} (User: ${userId})`);
      } else {
        // Clean up missing socket ID
        clientIds.delete(clientId);
        this.logger.warn(`Socket ID ${clientId} not found for user ${userId}. Cleaning up map.`);
      }
    });
    
    // Post-cleanup check
    if (clientIds.size === 0) {
      this.userToClients.delete(userId);
    }
  }

  @SubscribeMessage('mark-as-read')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: string }
  ) {
    await this.notificationsService.markAsRead(data.notificationId); 
    return { event: 'status', success: true, message: 'Notification marked as read.' }; 
  }

  @SubscribeMessage('mark-all-read')
  async handleMarkAllAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string }
  ) {
    const clientUserId = (client as any).userId;
    if (clientUserId !== data.userId) {
        throw new UnauthorizedException('Cannot mark all notifications for another user.');
    }
    
    await this.notificationsService.markAllAsRead(data.userId);
    return { event: 'status', success: true, message: 'All notifications marked as read.' };
  }

  @SubscribeMessage('delete')
  async handleDelete(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: string }
  ) {
    await this.notificationsService.delete(data.notificationId);
    return { event: 'status', success: true, message: 'Notification deleted.' };
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
      this.logger.verbose(`Sent initial data to client ${client.id}`);
    } catch (error) {
      this.logger.error('Failed to send initial data', error);
    }
  }
}