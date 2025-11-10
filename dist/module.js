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
const common_1 = require("@nestjs/common");
const types_1 = require("./types/types");
const notification_controller_1 = require("./controllers/notification.controller");
const notification_service_1 = require("./services/notification.service");
const notifications_websocket_gateway_1 = require("./gateways/notifications-websocket.gateway");
const notifications_core_1 = require("@synq/notifications-core"); // Assuming this import path
/**
 * Creates the NotificationCenter instance and performs the asynchronous startup.
 * @param options The module configuration options.
 * @returns A fully initialized NotificationCenter instance.
 */
async function createNotificationCenter(options) {
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
    // 3. CRITICAL FIX: Await the startup here! This tells NestJS to block 
    //    bootstrap until the external core library is fully initialized.
    await center.start();
    console.log('NotificationCenter: Core library started successfully in factory.');
    return center;
}
let NotificationsModule = NotificationsModule_1 = class NotificationsModule {
    /**
     * Static method for synchronous or value-based module configuration.
     * This is provided for simple, non-async configurations.
     */
    static forRoot(options) {
        const notificationCenterProvider = {
            provide: types_1.NOTIFICATION_CENTER,
            // We rely on the core library's adapters being non-blocking in their constructor
            useFactory: async () => await createNotificationCenter(options),
        };
        const providers = [
            notificationCenterProvider,
            notification_service_1.NotificationsService,
        ];
        const controllers = options.enableRestApi !== false
            ? [notification_controller_1.NotificationsController]
            : [];
        let exports = [notification_service_1.NotificationsService, types_1.NOTIFICATION_CENTER];
        if (options.enableWebSocket !== false) {
            providers.push(notifications_websocket_gateway_1.NotificationsGateway);
            // Gateways are not exported, as requested.
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
     * (like ConfigService) are needed. This should be the preferred method.
     */
    static forRootAsync(options) {
        const notificationCenterProvider = {
            provide: types_1.NOTIFICATION_CENTER,
            // The useFactory function will now be injected with the requested modules
            useFactory: async (...args) => {
                // Map the options back from the injected arguments if necessary, 
                // but typically the entire resolved config object is returned by the options factory.
                const resolvedOptions = await options.useFactory?.(...args);
                return createNotificationCenter(resolvedOptions);
            },
            inject: options.inject,
            // imports: options.imports,
        };
        const providers = [
            notificationCenterProvider,
            notification_service_1.NotificationsService,
        ];
        // NOTE: If using forRootAsync, options.useFactory must return NotificationsModuleOptions
        // We cannot reliably access options.enableRestApi here without a specific Inject token.
        // For simplicity, we assume REST and WS are enabled for Async setup, or you
        // will need to pass config into the factory.
        // For now, we assume you'll handle controller/gateway conditional logic based on configuration
        // *inside* your options factory if you need to disable them for async.
        const controllers = [notification_controller_1.NotificationsController]; // Assume enabled
        const exports = [notification_service_1.NotificationsService, types_1.NOTIFICATION_CENTER];
        providers.push(notifications_websocket_gateway_1.NotificationsGateway); // Assume enabled
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
