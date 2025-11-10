import { DynamicModule } from '@nestjs/common';
import { NotificationsModuleOptions, NotificationsModuleAsyncOptions } from './types/types';
import { NotificationCenter } from '@synq/notifications-core';
export declare function getNotificationCenterInstance(): NotificationCenter;
export declare class NotificationsModule {
    /**
     * Static method for synchronous or value-based module configuration.
     */
    static forRoot(options: NotificationsModuleOptions): DynamicModule;
    /**
     * Asynchronous method for configuring the module when external dependencies
     * (like ConfigService) are needed.
     */
    static forRootAsync(options: NotificationsModuleAsyncOptions): DynamicModule;
}
