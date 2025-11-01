// ============================================================================
// NOTIFICATIONS MODULE
// ============================================================================

@Global()
@Module({})
export class NotificationsModule {
  static forRoot(options: NotificationsModuleOptions): DynamicModule {
    const notificationCenterProvider: Provider = {
      provide: NOTIFICATION_CENTER,
      useFactory: () => {
        const center = new NotificationCenter({
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

    const providers: Provider[] = [
      optionsProvider,
      notificationCenterProvider,
      NotificationsService
    ];

    const controllers = options.enableRestApi !== false 
      ? [NotificationsController] 
      : [];

    const exports = [NotificationsService, NOTIFICATION_CENTER];

    // Add WebSocket gateway if enabled
    if (options.enableWebSocket !== false) {
      providers.push(NotificationsGateway);
      exports.push(NotificationsGateway);
    }

    return {
      module: NotificationsModule,
      providers,
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
