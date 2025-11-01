// ============================================================================
// WEBSOCKET GATEWAY
// ============================================================================

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/notifications'
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationsGateway.name);
  private subscriptions = new Map<string, Unsubscribe>();

  @WebSocketServer()
  server: Server;

  constructor(private readonly notificationsService: NotificationsService) {}

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    
    if (!userId) {
      this.logger.warn('Client connected without userId');
      client.disconnect();
      return;
    }

    this.logger.log(`Client connected: ${client.id} (userId: ${userId})`);

    // Subscribe to notifications
    const unsubscribe = this.notificationsService.subscribe(
      userId,
      (notification) => {
        client.emit('notification', {
          type: 'notification',
          notification
        });
      }
    );

    // Subscribe to unread count changes
    const unsubscribeCount = this.notificationsService.onUnreadCountChange(
      userId,
      (count) => {
        client.emit('unread-count', {
          type: 'unread-count',
          count
        });
      }
    );

    // Store subscriptions
    this.subscriptions.set(client.id, () => {
      unsubscribe();
      unsubscribeCount();
    });

    // Send initial data
    this.sendInitialData(client, userId);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    const unsubscribe = this.subscriptions.get(client.id);
    if (unsubscribe) {
      unsubscribe();
      this.subscriptions.delete(client.id);
    }
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
