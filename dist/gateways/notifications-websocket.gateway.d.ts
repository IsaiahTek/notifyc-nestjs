import { OnModuleInit } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { NotificationsService } from '../services/notification.service';
import { Server, Socket } from 'socket.io';
export declare class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
    private readonly notificationsService;
    private readonly logger;
    private clientSubscriptions;
    private userToClients;
    server: Server;
    constructor(notificationsService: NotificationsService);
    onModuleInit(): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    private broadcastToUser;
    handleMarkAsRead(client: Socket, data: {
        notificationId: string;
    }): Promise<{
        success: boolean;
    }>;
    handleMarkAllAsRead(client: Socket, data: {
        userId: string;
    }): Promise<{
        success: boolean;
    }>;
    handleDelete(client: Socket, data: {
        notificationId: string;
    }): Promise<{
        success: boolean;
    }>;
    private sendInitialData;
}
