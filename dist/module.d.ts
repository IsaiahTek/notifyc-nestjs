import { DynamicModule } from '@nestjs/common';
import { NotificationsModuleOptions, NotificationsModuleAsyncOptions } from './types/types';
export declare class NotificationsModule {
    /**
     * Static method for synchronous or value-based module configuration.
     * This is provided for simple, non-async configurations.
     */
    static forRoot(options: NotificationsModuleOptions): DynamicModule;
    /**
     * Asynchronous method for configuring the module when external dependencies
     * (like ConfigService) are needed. This should be the preferred method.
     */
    static forRootAsync(options: NotificationsModuleAsyncOptions): DynamicModule;
}
