"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var NotificationsModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsModule = void 0;
exports.getNotificationCenterInstance = getNotificationCenterInstance;
const common_1 = require("@nestjs/common");
const notification_controller_1 = require("./controllers/notification.controller");
const notification_service_1 = require("./services/notification.service");
const notifications_websocket_gateway_1 = require("./gateways/notifications-websocket.gateway");
const notifications_core_1 = require("@synq/notifications-core");
/**
 * Stores the single initialized instance of the NotificationCenter.
 */
let globalNotificationCenterInstance = null;
let initializationPromise = null;
/**
 * Creates the NotificationCenter instance and performs async startup.
 */
async function createNotificationCenterAndSetGlobal(options) {
    if (globalNotificationCenterInstance) {
        console.warn('NotificationCenter: Attempted re-initialization. Returning existing instance.');
        return globalNotificationCenterInstance;
    }
    // Prevent multiple concurrent initializations
    if (initializationPromise) {
        console.log('NotificationCenter: Waiting for existing initialization...');
        return initializationPromise;
    }
    console.log('NotificationCenter: Creating new instance...');
    initializationPromise = (async () => {
        const center = new notifications_core_1.NotificationCenter({
            storage: options.storage,
            transports: options.transports,
            queue: options.queue,
            workers: options.workers,
            cleanup: options.cleanup,
            middleware: options.middleware
        });
        console.log('NotificationCenter: Instance created, registering templates...');
        if (options.templates) {
            options.templates.forEach(template => {
                center.registerTemplate(template);
                console.log(`NotificationCenter: Template registered: ${template.id}`);
            });
        }
        console.log('NotificationCenter: Starting center...');
        await center.start();
        console.log('NotificationCenter: Core library started successfully.');
        globalNotificationCenterInstance = center;
        return center;
    })();
    return initializationPromise;
}
function getNotificationCenterInstance() {
    if (!globalNotificationCenterInstance) {
        throw new Error("NotificationCenter is not initialized. Ensure NotificationsModule.forRoot() is called.");
    }
    return globalNotificationCenterInstance;
}
let NotificationsModule = NotificationsModule_1 = class NotificationsModule {
    static forRoot(options) {
        console.log('📦 NotificationsModule.forRoot() called');
        console.log('📦 Options:', {
            hasStorage: !!options.storage,
            hasTransports: !!options.transports,
            enableWebSocket: options.enableWebSocket,
            enableRestApi: options.enableRestApi,
            templatesCount: options.templates?.length || 0
        });
        // This provider ensures initialization happens, but we don't inject it anywhere
        const InitializationProvider = {
            provide: 'NOTIFICATION_MODULE_INITIALIZER',
            useFactory: async () => {
                console.log('⚙️  NOTIFICATION_MODULE_INITIALIZER: Starting initialization...');
                const center = await createNotificationCenterAndSetGlobal(options);
                console.log('✅ NOTIFICATION_MODULE_INITIALIZER: Initialization complete.');
                return center;
            },
        };
        // The service is a simple class - NestJS will inject it normally
        // It retrieves the center via the global getter in its onModuleInit
        const providers = [
            InitializationProvider,
            notification_service_1.NotificationsService,
        ];
        console.log('📦 Providers registered:', providers.length);
        const controllers = options.enableRestApi !== false
            ? [notification_controller_1.NotificationsController]
            : [];
        console.log('📦 Controllers registered:', controllers.length);
        const exports = [notification_service_1.NotificationsService];
        // Add Gateway as a simple provider - it will inject NotificationsService normally
        if (options.enableWebSocket !== false) {
            console.log('📦 Adding WebSocket Gateway...');
            providers.push(notifications_websocket_gateway_1.NotificationsGateway);
        }
        console.log('✅ NotificationsModule.forRoot() configuration complete');
        console.log('📦 Final provider count:', providers.length);
        return {
            module: NotificationsModule_1,
            providers,
            controllers,
            exports,
            // Mark the module as global so NotificationsService is available everywhere
            global: true,
        };
    }
    static forRootAsync(options) {
        const InitializationProvider = {
            provide: 'NOTIFICATION_MODULE_INITIALIZER_ASYNC',
            useFactory: async (...args) => {
                console.log('⚙️  NOTIFICATION_MODULE_INITIALIZER_ASYNC: Starting...');
                const resolvedOptions = await options.useFactory?.(...args);
                const center = await createNotificationCenterAndSetGlobal(resolvedOptions);
                console.log('✅ NOTIFICATION_MODULE_INITIALIZER_ASYNC: Complete.');
                return center;
            },
            inject: options.inject,
        };
        const providers = [
            InitializationProvider,
            notification_service_1.NotificationsService,
            notifications_websocket_gateway_1.NotificationsGateway,
        ];
        const controllers = [notification_controller_1.NotificationsController];
        const exports = [notification_service_1.NotificationsService];
        return {
            module: NotificationsModule_1,
            imports: options.imports,
            providers,
            controllers,
            exports,
            global: true,
        };
    }
};
exports.NotificationsModule = NotificationsModule;
exports.NotificationsModule = NotificationsModule = NotificationsModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], NotificationsModule);
