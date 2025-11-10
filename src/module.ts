import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { NotificationsModuleOptions, NotificationsModuleAsyncOptions, NOTIFICATION_CENTER } from './types/types';
import { NotificationsController } from './controllers/notification.controller';
import { NotificationsService } from './services/notification.service';
import { NotificationsGateway } from './gateways/notifications-websocket.gateway';
import { NotificationCenter } from '@synq/notifications-core';

/**
 * Stores the single initialized instance of the NotificationCenter.
 */
let globalNotificationCenterInstance: NotificationCenter | null = null;

/**
 * Creates the NotificationCenter instance and performs async startup.
 */
async function createNotificationCenterAndSetGlobal(options: NotificationsModuleOptions): Promise<NotificationCenter> {
    if (globalNotificationCenterInstance) {
        console.warn('NotificationCenter: Attempted re-initialization. Returning existing instance.');
        return globalNotificationCenterInstance;
    }

    console.log('NotificationCenter: Creating new instance...');

    const center = new NotificationCenter({
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
}

export function getNotificationCenterInstance(): NotificationCenter {
    if (!globalNotificationCenterInstance) {
        throw new Error("NotificationCenter is not initialized. Ensure NotificationsModule.forRoot() is called.");
    }
    return globalNotificationCenterInstance;
}

@Global()
@Module({})
export class NotificationsModule {

    static forRoot(options: NotificationsModuleOptions): DynamicModule {
        // Step 1: Initialize the NotificationCenter asynchronously
        const InitializationProvider: Provider = {
            provide: 'NOTIFICATION_MODULE_INITIALIZER',
            useFactory: async () => {
                console.log('NOTIFICATION_MODULE_INITIALIZER: Starting initialization...');
                const center = await createNotificationCenterAndSetGlobal(options);
                console.log('NOTIFICATION_MODULE_INITIALIZER: Initialization complete.');
                return center;
            },
        };

        // Step 2: Provide NotificationsService as a regular provider
        // It doesn't need to wait for initialization since it uses the global getter
        const providers: Provider[] = [
            InitializationProvider,
            NotificationsService,
        ];

        const controllers = options.enableRestApi !== false
            ? [NotificationsController]
            : [];

        const exports: any[] = [NotificationsService];

        // Step 3: Add Gateway with explicit dependency injection
        if (options.enableWebSocket !== false) {
            providers.push({
                provide: NotificationsGateway,
                useFactory: (notificationsService: NotificationsService) => {
                    console.log('NotificationsGateway: Creating instance with injected service...');
                    return new NotificationsGateway(notificationsService);
                },
                inject: [NotificationsService],
            });
        }

        return {
            module: NotificationsModule,
            providers,
            controllers,
            exports
        };
    }

    static forRootAsync(options: NotificationsModuleAsyncOptions): DynamicModule {
        const InitializationProvider: Provider = {
            provide: 'NOTIFICATION_MODULE_INITIALIZER_ASYNC',
            useFactory: async (...args: any[]) => {
                console.log('NOTIFICATION_MODULE_INITIALIZER_ASYNC: Starting...');
                const resolvedOptions = await options.useFactory?.(...args);
                const center = await createNotificationCenterAndSetGlobal(resolvedOptions!);
                console.log('NOTIFICATION_MODULE_INITIALIZER_ASYNC: Complete.');
                return center;
            },
            inject: options.inject,
        };

        const providers: Provider[] = [
            InitializationProvider,
            NotificationsService,
        ];

        const controllers = [NotificationsController];
        const exports: any[] = [NotificationsService];

        providers.push({
            provide: NotificationsGateway,
            useFactory: (notificationsService: NotificationsService) => {
                console.log('NotificationsGateway (async): Creating instance...');
                return new NotificationsGateway(notificationsService);
            },
            inject: [NotificationsService],
        });

        return {
            module: NotificationsModule,
            imports: options.imports,
            providers,
            controllers,
            exports
        };
    }
}