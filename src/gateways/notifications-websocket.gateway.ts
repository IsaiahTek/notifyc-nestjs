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
      console.log("ABOUT TO BROADCAST NOTIFICATION VIA WEBSOCKET TO USER: ", notification.userId)
      this.broadcastToUser(notification.userId, 'notification', {
        type: 'notification',
        notification
      });
    });

    // 2. LISTEN TO THE LOCAL SERVICE EVENT EMITTER (via Service's onNotificationSent)
    // This catches the immediate manual emit() from the NotificationsService.send() method.
    this.notificationsService.onNotificationSent((notification) => {
      console.log("⚡ Local Emitter: Broadcast triggered for: ", notification.userId);
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

  // File: notifications-websocket.gateway.ts

  // File: notifications-websocket.gateway.ts

  private broadcastToUser(userId: string, event: string, data: any) {
    // 🌟 FIX: Check for the required structure and/or ensure the Socket.IO method is used correctly

    // 1. Check if the server object is initialized AND has a sockets collection
    // This is the structure that holds all client connections.
    if (!this.server || !this.server.sockets) {
      this.logger.error('WebSocket server or its sockets collection is not yet initialized. Skipping broadcast.');
      return;
    }

    const clientIds = this.userToClients.get(userId);
    if (!clientIds || clientIds.size === 0) return;

    // 2. Use the correct property access: this.server.sockets is a Namespace.
    // The error is likely here: this.server.sockets.sockets.get(clientId)

    clientIds.forEach(clientId => {
      // Use the standard way to retrieve a socket by ID from the default namespace
      // If your gateway uses a namespace (`/notifications`), you must use that namespace object.
      // Since @WebSocketServer() by default points to the default namespace,
      // and you are defining a separate namespace, we need to access the correct one.

      // Let's assume `this.server` is correctly typed to the Server instance:
      let socket = this.server.sockets.sockets.get(clientId);

      // If the above line still fails, it means `this.server.sockets` is NOT the standard default namespace,
      // or the server is not ready. Given your structure:

      const namespace = this.server.of('/notifications'); // Access your specific namespace
      if (!namespace) {
        this.logger.error('Custom WebSocket namespace /notifications not initialized.');
        return;
      }

      socket = namespace.sockets.get(clientId); // Access socket via the namespace

      if (socket) {
        socket.emit(event, data);
        // ... (optional log)
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
