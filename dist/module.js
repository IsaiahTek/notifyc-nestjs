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
 * This global static property breaks the DI chain that causes the hang.
 */
let globalNotificationCenterInstance = null;
/**
 * Creates the NotificationCenter instance, performs the asynchronous startup, and sets the global singleton.
 * @param options The module configuration options.
 * @returns A fully initialized NotificationCenter instance (also sets the global singleton).
 */
async function createNotificationCenterAndSetGlobal(options) {
    // If already initialized (e.g., in case of a recursive import attempt), return existing.
    if (globalNotificationCenterInstance) {
        console.warn('NotificationCenter: Attempted re-initialization. Returning existing instance.');
        return globalNotificationCenterInstance;
    }
    // 1. Create the NotificationCenter instance
    const center = new notifications_core_1.NotificationCenter({
        storage: options.storage,
        transports: options.transports,
        queue: options.queue,
        workers: options.workers,
        cleanup: options.cleanup,
        middleware: options.middleware
    });
    // 2. Register templates (synchronous)
    if (options.templates) {
        options.templates.forEach(template => {
            center.registerTemplate(template);
        });
    }
    // 3. CRITICAL: Await the startup here to ensure readiness before NestJS bootstrap finishes.
    await center.start();
    console.log('NotificationCenter: Core library started successfully and singleton set.');
    // 4. Set the global singleton instance
    globalNotificationCenterInstance = center;
    return center;
}
// Export the getter for the service to use
function getNotificationCenterInstance() {
    if (!globalNotificationCenterInstance) {
        throw new Error("NotificationCenter is not initialized. Ensure NotificationsModule.forRoot() is called in the root module and awaited.");
    }
    return globalNotificationCenterInstance;
}
let NotificationsModule = NotificationsModule_1 = class NotificationsModule {
    /**
     * Static method for synchronous or value-based module configuration.
     */
    static forRoot(options) {
        // Initialization provider to start the notification center
        const InitializationProvider = {
            provide: 'NOTIFICATION_MODULE_INITIALIZER',
            useFactory: async () => await createNotificationCenterAndSetGlobal(options),
        };
        const providers = [
            InitializationProvider,
            notification_service_1.NotificationsService,
        ];
        const controllers = options.enableRestApi !== false
            ? [notification_controller_1.NotificationsController]
            : [];
        const exports = [notification_service_1.NotificationsService];
        // Add WebSocket Gateway if enabled
        if (options.enableWebSocket !== false) {
            providers.push(notifications_websocket_gateway_1.NotificationsGateway);
            // DON'T export the gateway - it's only used internally
        }
        return {
            module: NotificationsModule_1,
            providers,
            controllers,
            exports
        };
    }
    /**
     * Asynchronous method for configuring the module when external dependencies
     * (like ConfigService) are needed.
     */
    static forRootAsync(options) {
        const InitializationProvider = {
            provide: 'NOTIFICATION_MODULE_INITIALIZER_ASYNC',
            useFactory: async (...args) => {
                const resolvedOptions = await options.useFactory?.(...args);
                return createNotificationCenterAndSetGlobal(resolvedOptions);
            },
            inject: options.inject,
        };
        const providers = [
            InitializationProvider,
            notification_service_1.NotificationsService,
        ];
        const controllers = [notification_controller_1.NotificationsController];
        const exports = [notification_service_1.NotificationsService];
        // Add gateway for async configuration too
        providers.push(notifications_websocket_gateway_1.NotificationsGateway);
        return {
            module: NotificationsModule_1,
            imports: options.imports,
            providers,
            controllers,
            exports
        };
    }
};
exports.NotificationsModule = NotificationsModule;
exports.NotificationsModule = NotificationsModule = NotificationsModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], NotificationsModule);
