// ============================================================================
// NOTIFICATIONS MODULE
// ============================================================================

import { Global, Module, DynamicModule, Provider } from "@nestjs/common";
import { NotificationsController } from "./controllers/notification.controller";
import { NotificationsGateway } from "./gateways/notifications-websocket.gateway";
import { NotificationsService } from "./services/notification.service";
import { NotificationsModuleOptions, NOTIFICATION_CENTER, NOTIFICATION_OPTIONS, NotificationsModuleAsyncOptions } from "./types/types";
import { NotificationCenter } from "@synq/notifications-core";

@Global()
@Module({})
export class NotificationsModule {
  static forRoot(options: NotificationsModuleOptions): DynamicModule {
    const notificationCenterProvider: Provider = {
      // ... (definition remains the same)
      provide: NOTIFICATION_CENTER,
      useFactory: () => {
        const center = new NotificationCenter({
          // ... (config remains the same)
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

    const optionsProvider: Provider = {
      provide: NOTIFICATION_OPTIONS,
      useValue: options
    };

    let providers: Provider[] = [
      optionsProvider,
      notificationCenterProvider,
      NotificationsService // Base Service is always a provider
    ];

    const controllers = options.enableRestApi !== false
      ? [NotificationsController]
      : [];

    let exports: any[] = [NotificationsService, NOTIFICATION_CENTER];

    // Add WebSocket gateway if enabled
    if (options.enableWebSocket !== false) {
      // FIX: Add the Gateway to PROVIDERS, as it is a class that needs
      // to be instantiated for its functionality (like a service/component)
      providers.push(NotificationsGateway);
      // FIX: Also export it if consumers need to inject it (though often
      // not needed for a Gateway, but safe for completeness)
      // exports.push(NotificationsGateway);
    }
    
    // FIX: The issue might have been with the original logic's flow leading
    // to an incorrect `providers` array in the final return object.
    // The previous implementation block had the correct logic commented out
    // and the incorrect one returned, which might be a copy-paste error.
    // Ensure the above calculated 'providers' array is used.

    return {
      module: NotificationsModule,
      providers, // Use the dynamically built providers array
      controllers,
      exports
    };
  }

  static forRootAsync(
    options: NotificationsModuleAsyncOptions
  ): DynamicModule {
    const notificationCenterProvider: Provider = {
      provide: NOTIFICATION_CENTER,
      useFactory: async (opts: NotificationsModuleOptions) => {
        const center = new NotificationCenter({
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
      inject: [NOTIFICATION_OPTIONS]
    };

    const asyncProviders = this.createAsyncProviders(options);

    return {
      module: NotificationsModule,
      imports: options.imports || [],
      providers: [
        ...asyncProviders,
        notificationCenterProvider,
        NotificationsService,
        NotificationsGateway
      ],
      controllers: [NotificationsController],
      exports: [NotificationsService, NOTIFICATION_CENTER, NotificationsGateway]
    };
  }

  private static createAsyncProviders(
    options: NotificationsModuleAsyncOptions
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: NOTIFICATION_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || []
        }
      ];
    }

    return [];
  }
}
