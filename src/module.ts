import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { NotificationsModuleOptions, NotificationsModuleAsyncOptions } from './types/types';
import { NotificationsController } from './controllers/notification.controller';
import { NotificationsService } from './services/notification.service';
import { NotificationsGateway } from './gateways/notifications-websocket.gateway';
import { NotificationCenter } from '@synq/notifications-core';

let globalNotificationCenterInstance: NotificationCenter | null = null;
let initializationPromise: Promise<NotificationCenter> | null = null;

async function createNotificationCenterAndSetGlobal(options: NotificationsModuleOptions): Promise<NotificationCenter> {
    if (globalNotificationCenterInstance) {
        console.warn('NotificationCenter: Attempted re-initialization. Returning existing instance.');
        return globalNotificationCenterInstance;
    }

    if (initializationPromise) {
        console.log('NotificationCenter: Waiting for existing initialization...');
        return initializationPromise;
    }

    console.log('NotificationCenter: Creating new instance...');

    initializationPromise = (async () => {
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
    })();

    return initializationPromise;
}

export function getNotificationCenterInstance(): NotificationCenter {
    if (!globalNotificationCenterInstance) {
        throw new Error("NotificationCenter is not initialized. Ensure NotificationsModule.forRoot() is called.");
    }
    return globalNotificationCenterInstance;
}

/**
 * A static module that provides the gateway.
 * This is imported separately to work around DI issues with dynamic modules.
 */
@Module({
    providers: [NotificationsGateway],
    exports: [NotificationsGateway],
})
export class NotificationsGatewayModule {}

@Global()
@Module({})
export class NotificationsModule {

    static forRoot(options: NotificationsModuleOptions): DynamicModule {
        console.log('📦 NotificationsModule.forRoot() called');

        const InitializationProvider: Provider = {
            provide: 'NOTIFICATION_MODULE_INITIALIZER',
            useFactory: async () => {
                console.log('⚙️  NOTIFICATION_MODULE_INITIALIZER: Starting initialization...');
                const center = await createNotificationCenterAndSetGlobal(options);
                console.log('✅ NOTIFICATION_MODULE_INITIALIZER: Initialization complete.');
                return center;
            },
        };

        const providers: Provider[] = [
            InitializationProvider,
            NotificationsService,
        ];

        const controllers = options.enableRestApi !== false
            ? [NotificationsController]
            : [];

        const imports = options.enableWebSocket !== false
            ? [NotificationsGatewayModule]
            : [];

        const exports: any[] = [NotificationsService];

        console.log('✅ NotificationsModule.forRoot() configuration complete');

        return {
            module: NotificationsModule,
            imports,
            providers,
            controllers,
            exports,
            global: true,
        };
    }

    static forRootAsync(options: NotificationsModuleAsyncOptions): DynamicModule {
        const InitializationProvider: Provider = {
            provide: 'NOTIFICATION_MODULE_INITIALIZER_ASYNC',
            useFactory: async (...args: any[]) => {
                console.log('⚙️  NOTIFICATION_MODULE_INITIALIZER_ASYNC: Starting...');
                const resolvedOptions = await options.useFactory?.(...args);
                const center = await createNotificationCenterAndSetGlobal(resolvedOptions!);
                console.log('✅ NOTIFICATION_MODULE_INITIALIZER_ASYNC: Complete.');
                return center;
            },
            inject: options.inject,
        };

        const providers: Provider[] = [
            InitializationProvider,
            NotificationsService,
        ];

        const controllers = [NotificationsController];
        const importsArray = [...(options.imports || []), NotificationsGatewayModule];
        const exports: any[] = [NotificationsService];

        return {
            module: NotificationsModule,
            imports: importsArray,
            providers,
            controllers,
            exports,
            global: true,
        };
    }
}