"use strict";
// ============================================================================
// NOTIFICATION SERVICE
// ============================================================================
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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const notifications_core_1 = require("@synq/notifications-core");
const events_1 = require("events");
const types_1 = require("../types/types");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(notificationCenter) {
        this.notificationCenter = notificationCenter;
        this.logger = new common_1.Logger(NotificationsService_1.name);
        this.eventEmitter = new events_1.EventEmitter();
        // ADDED: Flag to track if startup failed
        this.startupFailed = false;
        this.isReady = new Promise(resolve => {
            this.onReadyResolve = resolve;
        });
    }
    // File: notification.service.ts (Library Code)
    async onModuleInit() {
        this.logger.log('--- 1. onModuleInit STARTING ---'); // <--- LOG 1
        try {
            // Immediately resolve the promise to unblock DI resolution
            // THIS IS THE CRITICAL CHANGE
            this.onReadyResolve();
            this.logger.log('--- 2. Ready Promise RESOLVED (Unblocked DI) ---');
            // Now, safely await the start() call. If it hangs, at least the 
            // NotificationsService instance is available for injection.
            await this.notificationCenter.start();
            this.logger.log('--- 3. NotificationCenter STARTED OK ---');
        }
        catch (e) {
            this.logger.error('--- 🚨 CRITICAL STARTUP FAILURE ---', e);
            this.startupFailed = true; // Set flag to fail gracefully later
            // The promise is already resolved, so we just log the failure.
        }
    }
    async onModuleDestroy() {
        await this.notificationCenter.stop();
        this.logger.log('Notification system stopped');
    }
    // ========== EVENT EMITTER (for WebSocket integration) ==========
    onNotificationSent(callback) {
        this.eventEmitter.on('notification:sent', callback);
        return () => this.eventEmitter.off('notification:sent', callback);
    }
    onUnreadCountChanged(callback) {
        this.eventEmitter.on('unread:changed', callback);
        return () => this.eventEmitter.off('unread:changed', callback);
    }
    // ========== SEND OPERATIONS ==========
    // File: notification.service.ts
    async send(input) {
        await this.isReady;
        if (this.startupFailed) {
            throw new common_1.InternalServerErrorException('Notification system failed to start during initialization.');
        }
        this.logger.log(`--- 4. SEND METHOD RESUMED. Calling NotificationCenter.send()... ---`);
        let notification;
        try {
            notification = await this.notificationCenter.send(input);
            this.eventEmitter.emit('notification:sent', notification);
        }
        catch (error) {
            const errorMessage = `Failed to send notification via NotificationCenter: ${error.message}`;
            console.error(errorMessage, error); // Use console.error for visibility
            this.logger.error(errorMessage, error.stack);
            throw new common_1.InternalServerErrorException('Notification sending failed.');
        }
        return notification;
    }
    async sendBatch(inputs) {
        await this.isReady;
        const notifications = await this.notificationCenter.sendBatch(inputs);
        // Emit event for each notification
        notifications.forEach(notification => {
            this.eventEmitter.emit('notification:sent', notification);
        });
        return notifications;
    }
    async schedule(input, when) {
        await this.isReady;
        return this.notificationCenter.schedule(input, when);
    }
    // ========== QUERY OPERATIONS ==========
    async getForUser(userId, filters) {
        return this.notificationCenter.getForUser(userId, filters);
    }
    async getById(id) {
        return this.notificationCenter.getById(id);
    }
    async getUnreadCount(userId) {
        return this.notificationCenter.getUnreadCount(userId);
    }
    async getStats(userId) {
        return this.notificationCenter.getStats(userId);
    }
    // ========== STATE OPERATIONS ==========
    async markAsRead(notificationId) {
        await this.isReady;
        const notification = await this.notificationCenter.getById(notificationId);
        await this.notificationCenter.markAsRead(notificationId);
        if (notification) {
            const count = await this.notificationCenter.getUnreadCount(notification.userId);
            this.eventEmitter.emit('unread:changed', notification.userId, count);
        }
    }
    async markAllAsRead(userId) {
        await this.isReady;
        await this.notificationCenter.markAllAsRead(userId);
        this.eventEmitter.emit('unread:changed', userId, 0);
    }
    async delete(notificationId) {
        await this.isReady;
        return this.notificationCenter.delete(notificationId);
    }
    async deleteAll(userId) {
        await this.isReady;
        return this.notificationCenter.deleteAll(userId);
    }
    // ========== PREFERENCES ==========
    async getPreferences(userId) {
        return this.notificationCenter.getPreferences(userId);
    }
    async updatePreferences(userId, prefs) {
        return this.notificationCenter.updatePreferences(userId, prefs);
    }
    // ========== TEMPLATES ==========
    registerTemplate(template) {
        this.isReady.then(() => {
            this.notificationCenter.registerTemplate(template);
            this.logger.log(`Notification template registered: ${template.type}`);
        });
    }
    // ========== SUBSCRIPTIONS ==========
    subscribe(userId, callback) {
        return this.notificationCenter.subscribe(userId, callback);
    }
    onUnreadCountChange(userId, callback) {
        return this.notificationCenter.onUnreadCountChange(userId, callback);
    }
    // ========== HEALTH ==========
    async healthCheck() {
        return this.notificationCenter.healthCheck();
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(types_1.NOTIFICATION_CENTER)),
    __metadata("design:paramtypes", [notifications_core_1.NotificationCenter])
], NotificationsService);
