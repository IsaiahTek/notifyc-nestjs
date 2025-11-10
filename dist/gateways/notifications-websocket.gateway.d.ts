import { OnModuleInit } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { NotificationsService } from '../services/notification.service';
import { Server, Socket } from 'socket.io';
export declare class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
    private readonly notificationsService;
    private readonly logger;
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
        event: string;
        success: boolean;
        message: string;
    }>;
    handleMarkAllAsRead(client: Socket, data: {
        userId: string;
    }): Promise<{
        event: string;
        success: boolean;
        message: string;
    }>;
    handleDelete(client: Socket, data: {
        notificationId: string;
    }): Promise<{
        event: string;
        success: boolean;
        message: string;
    }>;
    private sendInitialData;
}
