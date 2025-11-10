"use strict";
// ============================================================================
// NOTIFICATIONS MODULE
// ============================================================================
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
const notification_controller_1 = require("./controllers/notification.controller");
const notifications_websocket_gateway_1 = require("./gateways/notifications-websocket.gateway");
const notification_service_1 = require("./services/notification.service");
const types_1 = require("./types/types");
const notifications_core_1 = require("@synq/notifications-core");
let NotificationsModule = NotificationsModule_1 = class NotificationsModule {
    static forRoot(options) {
        const notificationCenterProvider = {
            provide: types_1.NOTIFICATION_CENTER,
            useFactory: () => {
                const center = new notifications_core_1.NotificationCenter({
                    storage: options.storage,
                    transports: options.transports,
                    queue: options.queue,
                    workers: options.workers,
                    cleanup: options.cleanup,
                    middleware: options.middleware
                });
                // Register templates
                if (options.templates) {
                    options.templates.forEach(template => {
                        center.registerTemplate(template);
                    });
                }
                return center;
            }
        };
        const optionsProvider = {
            provide: types_1.NOTIFICATION_OPTIONS,
            useValue: options
        };
        const providers = [
            optionsProvider,
            notificationCenterProvider,
            {
                provide: notification_service_1.NotificationsService,
                useValue: (0, common_1.forwardRef)(() => notification_service_1.NotificationsService)
            }
        ];
        const controllers = options.enableRestApi !== false
            ? [notification_controller_1.NotificationsController]
            : [];
        const exports = [notification_service_1.NotificationsService, types_1.NOTIFICATION_CENTER];
        // Add WebSocket gateway if enabled
        if (options.enableWebSocket !== false) {
            providers.push(notifications_websocket_gateway_1.NotificationsGateway);
            exports.push(notifications_websocket_gateway_1.NotificationsGateway);
        }
        return {
            module: NotificationsModule_1,
            providers,
            controllers,
            exports
        };
        // const providers: Provider[] = [
        //   optionsProvider,
        //   notificationCenterProvider,
        //   NotificationsService // <--- NotificationsService is the provider here
        // ];
        // const controllers = options.enableRestApi !== false 
        //   ? [NotificationsController] 
        //   : [];
        // const exports: any[] = [NotificationsService, NOTIFICATION_CENTER];
        // // Add WebSocket gateway if enabled
        // if (options.enableWebSocket !== false) {
        //   providers.push(NotificationsGateway);
        //   exports.push(NotificationsGateway);
        // }
        // return {
        //   module: NotificationsModule,
        //   providers, // <--- NotificationsGateway should NOT be here
        //   controllers,
        //   exports
        // };
    }
    static forRootAsync(options) {
        const notificationCenterProvider = {
            provide: types_1.NOTIFICATION_CENTER,
            useFactory: async (opts) => {
                const center = new notifications_core_1.NotificationCenter({
                    storage: opts.storage,
                    transports: opts.transports,
                    queue: opts.queue,
                    workers: opts.workers,
                    cleanup: opts.cleanup,
                    middleware: opts.middleware
                });
                if (opts.templates) {
                    opts.templates.forEach(template => {
                        center.registerTemplate(template);
                    });
                }
                return center;
            },
            inject: [types_1.NOTIFICATION_OPTIONS]
        };
        const asyncProviders = this.createAsyncProviders(options);
        return {
            module: NotificationsModule_1,
            imports: options.imports || [],
            providers: [
                ...asyncProviders,
                notificationCenterProvider,
                notification_service_1.NotificationsService,
                notifications_websocket_gateway_1.NotificationsGateway
            ],
            controllers: [notification_controller_1.NotificationsController],
            exports: [notification_service_1.NotificationsService, types_1.NOTIFICATION_CENTER, notifications_websocket_gateway_1.NotificationsGateway]
        };
    }
    static createAsyncProviders(options) {
        if (options.useFactory) {
            return [
                {
                    provide: types_1.NOTIFICATION_OPTIONS,
                    useFactory: options.useFactory,
                    inject: options.inject || []
                }
            ];
        }
        return [];
    }
};
exports.NotificationsModule = NotificationsModule;
exports.NotificationsModule = NotificationsModule = NotificationsModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], NotificationsModule);
