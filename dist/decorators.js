"use strict";
// ============================================================================
// DECORATORS
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.InjectNotificationsService = exports.InjectNotificationCenter = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("./types/types");
const notification_service_1 = require("./services/notification.service");
const InjectNotificationCenter = () => (0, common_1.Inject)(types_1.NOTIFICATION_CENTER);
exports.InjectNotificationCenter = InjectNotificationCenter;
const InjectNotificationsService = () => (0, common_1.Inject)(notification_service_1.NotificationsService);
exports.InjectNotificationsService = InjectNotificationsService;
// export const InjectNotificationTemplates = () => Inject(NOTIFICATION_TEMPLATES);
