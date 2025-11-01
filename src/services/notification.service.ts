// ============================================================================
// NOTIFICATION SERVICE
// ============================================================================

import { Inject, Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { NotificationCenter, NotificationInput, NotificationFilters, NotificationPreferences, NotificationTemplate, Unsubscribe, Notification } from "@synq/notifications-core";
import { EventEmitter } from "events";
import { NOTIFICATION_CENTER } from "../types/types";

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(NotificationsService.name);
    private eventEmitter = new EventEmitter();

    constructor(
        @Inject(NOTIFICATION_CENTER)
        private readonly notificationCenter: NotificationCenter
    ) { }

    async onModuleInit() {
        await this.notificationCenter.start();
        this.logger.log('Notification system started');
    }

    async onModuleDestroy() {
        await this.notificationCenter.stop();
        this.logger.log('Notification system stopped');
    }

    // ========== EVENT EMITTER (for WebSocket integration) ==========

    onNotificationSent(callback: (notification: Notification) => void): () => void {
        this.eventEmitter.on('notification:sent', callback);
        return () => this.eventEmitter.off('notification:sent', callback);
    }

    onUnreadCountChanged(callback: (userId: string, count: number) => void): () => void {
        this.eventEmitter.on('unread:changed', callback);
        return () => this.eventEmitter.off('unread:changed', callback);
    }

    // ========== SEND OPERATIONS ==========

    async send(input: NotificationInput): Promise<Notification> {
        const notification = await this.notificationCenter.send(input);

        // Emit event for WebSocket to pick up
        this.eventEmitter.emit('notification:sent', notification);

        return notification;
    }

    async sendBatch(inputs: NotificationInput[]): Promise<Notification[]> {
        const notifications = await this.notificationCenter.sendBatch(inputs);

        // Emit event for each notification
        notifications.forEach(notification => {
            this.eventEmitter.emit('notification:sent', notification);
        });

        return notifications;
    }

    async schedule(input: NotificationInput, when: Date): Promise<string> {
        return this.notificationCenter.schedule(input, when);
    }

    // ========== QUERY OPERATIONS ==========

    async getForUser(
        userId: string,
        filters?: NotificationFilters
    ): Promise<Notification[]> {
        return this.notificationCenter.getForUser(userId, filters);
    }

    async getById(id: string): Promise<Notification | null> {
        return this.notificationCenter.getById(id);
    }

    async getUnreadCount(userId: string): Promise<number> {
        return this.notificationCenter.getUnreadCount(userId);
    }

    async getStats(userId: string) {
        return this.notificationCenter.getStats(userId);
    }

    // ========== STATE OPERATIONS ==========

    async markAsRead(notificationId: string): Promise<void> {
        const notification = await this.notificationCenter.getById(notificationId);
        await this.notificationCenter.markAsRead(notificationId);

        if (notification) {
            const count = await this.notificationCenter.getUnreadCount(notification.userId);
            this.eventEmitter.emit('unread:changed', notification.userId, count);
        }
    }

    async markAllAsRead(userId: string): Promise<void> {
        await this.notificationCenter.markAllAsRead(userId);
        this.eventEmitter.emit('unread:changed', userId, 0);
    }

    async delete(notificationId: string): Promise<void> {
        return this.notificationCenter.delete(notificationId);
    }

    async deleteAll(userId: string): Promise<void> {
        return this.notificationCenter.deleteAll(userId);
    }

    // ========== PREFERENCES ==========

    async getPreferences(userId: string): Promise<NotificationPreferences> {
        return this.notificationCenter.getPreferences(userId);
    }

    async updatePreferences(
        userId: string,
        prefs: Partial<NotificationPreferences>
    ): Promise<void> {
        return this.notificationCenter.updatePreferences(userId, prefs);
    }

    // ========== TEMPLATES ==========

    registerTemplate(template: NotificationTemplate): void {
        this.notificationCenter.registerTemplate(template);
    }

    // ========== SUBSCRIPTIONS ==========

    subscribe(
        userId: string,
        callback: (notification: Notification) => void
    ): Unsubscribe {
        return this.notificationCenter.subscribe(userId, callback);
    }

    onUnreadCountChange(
        userId: string,
        callback: (count: number, userId: string) => void
    ): Unsubscribe {
        return this.notificationCenter.onUnreadCountChange(userId, callback);
    }

    // ========== HEALTH ==========

    async healthCheck() {
        return this.notificationCenter.healthCheck();
    }
}
