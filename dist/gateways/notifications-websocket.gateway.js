"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var NotificationsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsGateway = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const notification_service_1 = require("../services/notification.service");
const socket_io_1 = require("socket.io");
let NotificationsGateway = NotificationsGateway_1 = class NotificationsGateway {
    constructor(notificationsService) {
        this.notificationsService = notificationsService;
        this.logger = new common_1.Logger(NotificationsGateway_1.name);
        // Maps user ID to a set of their connected socket IDs for broadcasting
        this.userToClients = new Map();
        this.logger.log('NotificationsGateway: Constructor called');
    }
    afterInit(server) {
        this.logger.log('WebSocket server initialized (afterInit hook)');
        this.logger.log(`Server instance available: ${!!server}`);
    }
    onModuleInit() {
        this.logger.log('WebSocket gateway initialization start.');
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
    handleConnection(client) {
        const userId = client.handshake.query.userId;
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
        this.userToClients.get(userId).add(client.id);
        // Store userId on socket for easy access
        client.userId = userId;
        // Send initial data immediately upon connection
        this.sendInitialData(client, userId);
    }
    handleDisconnect(client) {
        const userId = client.userId;
        if (!userId)
            return;
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
    broadcastToUser(userId, event, data) {
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
            const socket = this.server.sockets.get(clientId);
            if (socket) {
                socket.emit(event, data);
                this.logger.verbose(`✅ SENT ${event} to client: ${clientId} (User: ${userId})`);
            }
            else {
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
    async handleMarkAsRead(client, data) {
        await this.notificationsService.markAsRead(data.notificationId);
        return { event: 'status', success: true, message: 'Notification marked as read.' };
    }
    async handleMarkAllAsRead(client, data) {
        const clientUserId = client.userId;
        if (clientUserId !== data.userId) {
            throw new common_1.UnauthorizedException('Cannot mark all notifications for another user.');
        }
        await this.notificationsService.markAllAsRead(data.userId);
        return { event: 'status', success: true, message: 'All notifications marked as read.' };
    }
    async handleDelete(client, data) {
        await this.notificationsService.delete(data.notificationId);
        return { event: 'status', success: true, message: 'Notification deleted.' };
    }
    async sendInitialData(client, userId) {
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
        }
        catch (error) {
            this.logger.error('Failed to send initial data', error);
        }
    }
};
exports.NotificationsGateway = NotificationsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], NotificationsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('mark-as-read'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], NotificationsGateway.prototype, "handleMarkAsRead", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('mark-all-read'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], NotificationsGateway.prototype, "handleMarkAllAsRead", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('delete'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], NotificationsGateway.prototype, "handleDelete", null);
exports.NotificationsGateway = NotificationsGateway = NotificationsGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: { origin: '*' },
        namespace: '/notifications'
    }),
    __metadata("design:paramtypes", [notification_service_1.NotificationsService])
], NotificationsGateway);
