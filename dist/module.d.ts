import { DynamicModule } from "@nestjs/common";
import { NotificationsModuleOptions, NotificationsModuleAsyncOptions } from "./types/types";
export declare class NotificationsModule {
    static forRoot(options: NotificationsModuleOptions): DynamicModule;
    static forRootAsync(options: NotificationsModuleAsyncOptions): DynamicModule;
    private static createAsyncProviders;
}
