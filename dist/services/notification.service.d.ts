import { OnModuleDestroy } from "@nestjs/common";
import { NotificationInput, NotificationFilters, NotificationPreferences, NotificationTemplate, Unsubscribe, Notification } from "@synq/notifications-core";
export declare class NotificationsService implements OnModuleDestroy {
    private readonly logger;
    private eventEmitter;
    private readonly notificationCenter;
    constructor();
    onModuleDestroy(): Promise<void>;
    onNotificationSent(callback: (notification: Notification) => void): () => void;
    onUnreadCountChanged(callback: (userId: string, count: number) => void): () => void;
    send(input: NotificationInput): Promise<Notification>;
    sendBatch(inputs: NotificationInput[]): Promise<Notification[]>;
    schedule(input: NotificationInput, when: Date): Promise<string>;
    getForUser(userId: string, filters?: NotificationFilters): Promise<Notification[]>;
    getById(id: string): Promise<Notification | null>;
    getUnreadCount(userId: string): Promise<number>;
    getStats(userId: string): Promise<import("@synq/notifications-core").NotificationStats>;
    markAsRead(notificationId: string): Promise<void>;
    markAllAsRead(userId: string): Promise<void>;
    delete(notificationId: string): Promise<void>;
    deleteAll(userId: string): Promise<void>;
    getPreferences(userId: string): Promise<NotificationPreferences>;
    updatePreferences(userId: string, prefs: Partial<NotificationPreferences>): Promise<void>;
    registerTemplate(template: NotificationTemplate): void;
    subscribe(userId: string, callback: (notification: Notification) => void): Unsubscribe;
    onUnreadCountChange(userId: string, callback: (count: number, userId: string) => void): Unsubscribe;
    healthCheck(): Promise<Record<string, boolean>>;
}
