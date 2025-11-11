import { OnModuleInit } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export declare class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, OnModuleInit {
    private readonly logger;
    private userToClients;
    private notificationsService;
    server: Server;
    constructor();
    afterInit(server: Server): void;
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
