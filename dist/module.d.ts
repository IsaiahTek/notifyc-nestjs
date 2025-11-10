import { DynamicModule } from '@nestjs/common';
import { NotificationsModuleOptions, NotificationsModuleAsyncOptions } from './types/types';
import { NotificationCenter } from '@synq/notifications-core';
export declare function getNotificationCenterInstance(): NotificationCenter;
/**
 * A static module that provides the gateway.
 * This is imported separately to work around DI issues with dynamic modules.
 */
export declare class NotificationsGatewayModule {
}
export declare class NotificationsModule {
    static forRoot(options: NotificationsModuleOptions): DynamicModule;
    static forRootAsync(options: NotificationsModuleAsyncOptions): DynamicModule;
}
