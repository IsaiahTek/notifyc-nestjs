// ============================================================================
// NOTIFICATION SERVICE
// ============================================================================

import { Inject, Injectable, OnModuleInit, OnModuleDestroy, Logger, InternalServerErrorException } from "@nestjs/common";
import { NotificationCenter, NotificationInput, NotificationFilters, NotificationPreferences, NotificationTemplate, Unsubscribe, Notification } from "@synq/notifications-core";
import { EventEmitter } from "events";
import { NOTIFICATION_CENTER } from "../types/types";

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(NotificationsService.name);
    private eventEmitter = new EventEmitter();

    private isReady: Promise<void>;
    private onReadyResolve!: () => void;

    constructor(
        @Inject(NOTIFICATION_CENTER)
        private readonly notificationCenter: NotificationCenter
    ) {
        this.isReady = new Promise(resolve => {
            this.onReadyResolve = resolve;
        });
    }

    // File: notification.service.ts (Library Code)

    async onModuleInit() {
        this.logger.log('--- 1. onModuleInit STARTING ---'); // <--- LOG 1

        // Check if the NotificationCenter start call is the issue
        try {
            await this.notificationCenter.start(); // <-- This is the suspect line
            this.logger.log('--- 2. NotificationCenter STARTED OK ---'); // <--- LOG 2
            this.onReadyResolve();
            this.logger.log('--- 3. Ready Promise RESOLVED ---'); // <--- LOG 3
        } catch (e) {
            this.logger.error('--- 🚨 CRITICAL STARTUP FAILURE ---', e);
            // If it fails, we still need to resolve the promise to unblock the hanging HTTP request.
            // Resolve the promise, but ensure the send() method fails gracefully later.
            this.onReadyResolve();
        }
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

    // File: notification.service.ts

    async send(input: NotificationInput): Promise<Notification> {

        await this.isReady;

        // console.log("NOTIFICATION INPUT: ", input);
        // this.logger.log("NOTIFICATION INPUT: ", input);
        
        this.logger.log(`--- 4. SEND METHOD RESUMED. Calling NotificationCenter.send()... ---`); // <--- MUST ADD THIS LOG

        let notification: Notification;

        try {
            // 1. Await the external library's call
            notification = await this.notificationCenter.send(input);

            // 🌟 MISSING LINE: Emit the local event for the WebSocket to pick up
            this.eventEmitter.emit('notification:sent', notification); // <--- ADD THIS LINE

        } catch (error: any) {
            // 2. Catch ANY error that happens during the external call
            const errorMessage = `Failed to send notification via NotificationCenter: ${error.message}`;
            console.error(errorMessage, error); // Use console.error for visibility
            this.logger.error(errorMessage, error.stack);

            // Decide how to handle the error (e.g., throw it up or return null)
            // Throwing is usually best to signal failure to the client
            throw new InternalServerErrorException('Notification sending failed.');
        }

        // 3. This code WILL ONLY RUN if the try block succeeds
        // console.log("NOTIFICATION SENT: ", notification);
        // this.logger.log("NOTIFICATION SENT: ", notification);

        // If the log is still missing, the code is hanging BEFORE the log
        // If an ERROR LOG now appears, you've found the issue!

        return notification;
    }

    async sendBatch(inputs: NotificationInput[]): Promise<Notification[]> {

        await this.isReady;

        const notifications = await this.notificationCenter.sendBatch(inputs);

        // Emit event for each notification
        notifications.forEach(notification => {
            this.eventEmitter.emit('notification:sent', notification);
        });

        return notifications;
    }

    async schedule(input: NotificationInput, when: Date): Promise<string> {

        await this.isReady;

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

        await this.isReady;

        const notification = await this.notificationCenter.getById(notificationId);
        await this.notificationCenter.markAsRead(notificationId);

        if (notification) {
            const count = await this.notificationCenter.getUnreadCount(notification.userId);
            this.eventEmitter.emit('unread:changed', notification.userId, count);
        }
    }

    async markAllAsRead(userId: string): Promise<void> {
        await this.isReady;

        await this.notificationCenter.markAllAsRead(userId);
        this.eventEmitter.emit('unread:changed', userId, 0);
    }

    async delete(notificationId: string): Promise<void> {
        await this.isReady;

        return this.notificationCenter.delete(notificationId);
    }

    async deleteAll(userId: string): Promise<void> {
        await this.isReady;

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
        this.isReady.then(() => {
            this.notificationCenter.registerTemplate(template);
            this.logger.log(`Notification template registered: ${template.type}`);
        })

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
