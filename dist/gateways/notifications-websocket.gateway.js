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
// ============================================================================
// WEBSOCKET GATEWAY
// ============================================================================
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const notification_service_1 = require("../services/notification.service");
const socket_io_1 = require("socket.io");
let NotificationsGateway = NotificationsGateway_1 = class NotificationsGateway {
    constructor(notificationsService) {
        this.notificationsService = notificationsService;
        this.logger = new common_1.Logger(NotificationsGateway_1.name);
        this.subscriptions = new Map();
    }
    handleConnection(client) {
        const userId = client.handshake.query.userId;
        if (!userId) {
            this.logger.warn('Client connected without userId');
            client.disconnect();
            return;
        }
        this.logger.log(`Client connected: ${client.id} (userId: ${userId})`);
        // Subscribe to notifications
        const unsubscribe = this.notificationsService.subscribe(userId, (notification) => {
            client.emit('notification', {
                type: 'notification',
                notification
            });
        });
        // Subscribe to unread count changes
        const unsubscribeCount = this.notificationsService.onUnreadCountChange(userId, (count) => {
            client.emit('unread-count', {
                type: 'unread-count',
                count
            });
        });
        // Store subscriptions
        this.subscriptions.set(client.id, () => {
            unsubscribe();
            unsubscribeCount();
        });
        // Send initial data
        this.sendInitialData(client, userId);
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
        const unsubscribe = this.subscriptions.get(client.id);
        if (unsubscribe) {
            unsubscribe();
            this.subscriptions.delete(client.id);
        }
    }
    async handleMarkAsRead(client, data) {
        await this.notificationsService.markAsRead(data.notificationId);
        return { success: true };
    }
    async handleMarkAllAsRead(client, data) {
        await this.notificationsService.markAllAsRead(data.userId);
        return { success: true };
    }
    async handleDelete(client, data) {
        await this.notificationsService.delete(data.notificationId);
        return { success: true };
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
