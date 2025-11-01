// ============================================================================
// NOTIFICATION SERVICE
// ============================================================================

import { Inject, Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { NotificationCenter, NotificationInput, NotificationFilters, NotificationPreferences, NotificationTemplate, Unsubscribe, Notification } from "@synq/notifications-core";
import { NOTIFICATION_CENTER } from "../types/types";

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(NotificationsService.name);

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

    // ========== SEND OPERATIONS ==========

    async send(input: NotificationInput): Promise<Notification> {
        return this.notificationCenter.send(input);
    }

    async sendBatch(inputs: NotificationInput[]): Promise<Notification[]> {
        return this.notificationCenter.sendBatch(inputs);
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
        return this.notificationCenter.markAsRead(notificationId);
    }

    async markAllAsRead(userId: string): Promise<void> {
        return this.notificationCenter.markAllAsRead(userId);
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
        callback: (count: number) => void
    ): Unsubscribe {
        return this.notificationCenter.onUnreadCountChange(userId, callback);
    }

    // ========== HEALTH ==========

    async healthCheck() {
        return this.notificationCenter.healthCheck();
    }
}
