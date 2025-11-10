import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { NotificationsModuleOptions, NotificationsModuleAsyncOptions, NOTIFICATION_CENTER } from './types/types';
import { NotificationsController } from './controllers/notification.controller';
import { NotificationsService } from './services/notification.service';
import { NotificationsGateway } from './gateways/notifications-websocket.gateway';
import { NotificationCenter } from '@synq/notifications-core'; // Assuming this import path

/**
 * Creates the NotificationCenter instance and performs the asynchronous startup.
 * @param options The module configuration options.
 * @returns A fully initialized NotificationCenter instance.
 */
async function createNotificationCenter(options: NotificationsModuleOptions): Promise<NotificationCenter> {
    
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

    // 3. CRITICAL FIX: Await the startup here! This tells NestJS to block 
    //    bootstrap until the external core library is fully initialized.
    await center.start(); 
    console.log('NotificationCenter: Core library started successfully in factory.');

    return center;
}

@Global()
@Module({})
export class NotificationsModule {

  /**
   * Static method for synchronous or value-based module configuration.
   * This is provided for simple, non-async configurations.
   */
  static forRoot(options: NotificationsModuleOptions): DynamicModule {
    
    const notificationCenterProvider: Provider = {
      provide: NOTIFICATION_CENTER,
      // We rely on the core library's adapters being non-blocking in their constructor
      useFactory: async () => await createNotificationCenter(options),
    };
    
    const providers: Provider[] = [
      notificationCenterProvider,
      NotificationsService,
    ];

    const controllers = options.enableRestApi !== false 
      ? [NotificationsController] 
      : [];

    let exports: any[] = [NotificationsService, NOTIFICATION_CENTER];
    
    if (options.enableWebSocket !== false) {
      providers.push(NotificationsGateway);
      // Gateways are not exported, as requested.
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
   * (like ConfigService) are needed. This should be the preferred method.
   */
  static forRootAsync(options: NotificationsModuleAsyncOptions): DynamicModule {
    
    const notificationCenterProvider: Provider = {
      provide: NOTIFICATION_CENTER,
      // The useFactory function will now be injected with the requested modules
      useFactory: async (...args: any[]) => {
        // Map the options back from the injected arguments if necessary, 
        // but typically the entire resolved config object is returned by the options factory.
        const resolvedOptions = await options.useFactory?.(...args);
        return createNotificationCenter(resolvedOptions!);
      },
      inject: options.inject,
      // imports: options.imports,
    };
    
    const providers: Provider[] = [
      notificationCenterProvider,
      NotificationsService,
    ];

    // NOTE: If using forRootAsync, options.useFactory must return NotificationsModuleOptions
    // We cannot reliably access options.enableRestApi here without a specific Inject token.
    // For simplicity, we assume REST and WS are enabled for Async setup, or you
    // will need to pass config into the factory.
    
    // For now, we assume you'll handle controller/gateway conditional logic based on configuration
    // *inside* your options factory if you need to disable them for async.
    
    const controllers = [NotificationsController]; // Assume enabled
    const exports: any[] = [NotificationsService, NOTIFICATION_CENTER];
    
    providers.push(NotificationsGateway); // Assume enabled

    return {
      module: NotificationsModule,
      imports: options.imports,
      providers,
      controllers,
      exports
    };
  }
}