import { DynamicModule } from '@nestjs/common';
import { NotificationsModuleOptions, NotificationsModuleAsyncOptions } from './types/types';
import { NotificationCenter } from '@synq/notifications-core';
export declare function getNotificationCenterInstance(): NotificationCenter;
export declare class NotificationsModule {
    static forRoot(options: NotificationsModuleOptions): DynamicModule;
    static forRootAsync(options: NotificationsModuleAsyncOptions): DynamicModule;
}
