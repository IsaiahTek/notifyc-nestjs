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
const types_1 = require("../types/types");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(notificationCenter) {
        this.notificationCenter = notificationCenter;
        this.logger = new common_1.Logger(NotificationsService_1.name);
    }
    async onModuleInit() {
        await this.notificationCenter.start();
        this.logger.log('Notification system started');
    }
    async onModuleDestroy() {
        await this.notificationCenter.stop();
        this.logger.log('Notification system stopped');
    }
    // ========== SEND OPERATIONS ==========
    async send(input) {
        return this.notificationCenter.send(input);
    }
    async sendBatch(inputs) {
        return this.notificationCenter.sendBatch(inputs);
    }
    async schedule(input, when) {
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
        return this.notificationCenter.markAsRead(notificationId);
    }
    async markAllAsRead(userId) {
        return this.notificationCenter.markAllAsRead(userId);
    }
    async delete(notificationId) {
        return this.notificationCenter.delete(notificationId);
    }
    async deleteAll(userId) {
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
        this.notificationCenter.registerTemplate(template);
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
