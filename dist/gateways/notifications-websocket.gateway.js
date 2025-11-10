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
        this.clientSubscriptions = new Map();
        this.userToClients = new Map(); // userId -> Set of socket.ids
    }
    onModuleInit() {
        // This is the KEY fix - Subscribe to ALL notifications globally
        // and broadcast to connected clients for that user
        this.notificationsService.subscribe('*', (notification) => {
            console.log("ABOUT TO BROADCAST NOTIFICATION VIA WEBSOCKET TO USER: ", notification.userId);
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
    handleConnection(client) {
        const userId = client.handshake.query.userId;
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
        this.userToClients.get(userId).add(client.id);
        // Store userId on socket for easy access
        client.userId = userId;
        // Send initial data
        this.sendInitialData(client, userId);
    }
    handleDisconnect(client) {
        const userId = client.userId;
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
    broadcastToUser(userId, event, data) {
        // 🌟 FIX: Check for the required structure and/or ensure the Socket.IO method is used correctly
        // 1. Check if the server object is initialized AND has a sockets collection
        // This is the structure that holds all client connections.
        if (!this.server || !this.server.sockets) {
            this.logger.error('WebSocket server or its sockets collection is not yet initialized. Skipping broadcast.');
            return;
        }
        const clientIds = this.userToClients.get(userId);
        if (!clientIds || clientIds.size === 0)
            return;
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
