import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { NotificationsModuleOptions, NotificationsModuleAsyncOptions, NOTIFICATION_CENTER } from './types/types';
import { NotificationsController } from './controllers/notification.controller';
import { NotificationsService } from './services/notification.service';
import { NotificationsGateway } from './gateways/notifications-websocket.gateway';
import { NotificationCenter } from '@synq/notifications-core'; // Assuming this import path

/**
 * Stores the single initialized instance of the NotificationCenter.
 * This global static property breaks the DI chain that causes the hang.
 */
let globalNotificationCenterInstance: NotificationCenter | null = null;

/**
 * Creates the NotificationCenter instance, performs the asynchronous startup, and sets the global singleton.
 * @param options The module configuration options.
 * @returns A fully initialized NotificationCenter instance (also sets the global singleton).
 */
async function createNotificationCenterAndSetGlobal(options: NotificationsModuleOptions): Promise<NotificationCenter> {

    // If already initialized (e.g., in case of a recursive import attempt), return existing.
    if (globalNotificationCenterInstance) {
        console.warn('NotificationCenter: Attempted re-initialization. Returning existing instance.');
        return globalNotificationCenterInstance;
    }

    // 1. Create the NotificationCenter instance
    const center = new NotificationCenter({
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
export function getNotificationCenterInstance(): NotificationCenter {
    if (!globalNotificationCenterInstance) {
        throw new Error("NotificationCenter is not initialized. Ensure NotificationsModule.forRoot() is called in the root module and awaited.");
    }
    return globalNotificationCenterInstance;
}


@Global()
@Module({})
export class NotificationsModule {

    /**
     * Static method for synchronous or value-based module configuration.
     * This module no longer provides the NOTIFICATION_CENTER token to DI.
     */
    static forRoot(options: NotificationsModuleOptions): DynamicModule {

        // This is a dummy provider. We use a factory to force the async initialization to happen
        // but we DO NOT expose the instance via a DI token.
        const InitializationProvider: Provider = {
            provide: 'NOTIFICATION_MODULE_INITIALIZER', // Dummy token
            useFactory: async () => await createNotificationCenterAndSetGlobal(options),
        };

        const providers: Provider[] = [
            InitializationProvider,
            NotificationsService,
        ];

        const controllers = options.enableRestApi !== false
            ? [NotificationsController]
            : [];

        // We only export the service class itself. The service will use the global getter.
        let exports: any[] = [NotificationsService];

        if (options.enableWebSocket !== false) {
            providers.push({
                provide: NotificationsGateway,
                useFactory: (notificationsService: NotificationsService) => {
                    // Manually instantiate the class using the injected service
                    return new NotificationsGateway(notificationsService);
                },
                inject: [NotificationsService], // Explicitly declare the required dependency
            });
        }

        return {
            module: NotificationsModule,
            providers,
            controllers,
            exports
        };
    }

    /**
     * Asynchronous method for configuring the module when external dependencies 
     * (like ConfigService) are needed.
     */
    static forRootAsync(options: NotificationsModuleAsyncOptions): DynamicModule {

        const InitializationProvider: Provider = {
            provide: 'NOTIFICATION_MODULE_INITIALIZER_ASYNC', // Dummy token
            useFactory: async (...args: any[]) => {
                const resolvedOptions = await options.useFactory?.(...args);
                return createNotificationCenterAndSetGlobal(resolvedOptions!);
            },
            inject: options.inject,
            // imports: options.imports
        };

        const providers: Provider[] = [
            InitializationProvider,
            NotificationsService,
        ];

        const controllers = [NotificationsController];
        const exports: any[] = [NotificationsService];
        providers.push(NotificationsGateway);

        return {
            module: NotificationsModule,
            imports: options.imports,
            providers,
            controllers,
            exports
        };
    }
}