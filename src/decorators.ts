// ============================================================================
// DECORATORS
// ============================================================================

import { Inject } from '@nestjs/common';
import { NOTIFICATION_CENTER } from './types/types';
import { NotificationsService } from './services/notification.service';
export const InjectNotificationCenter = () => Inject(NOTIFICATION_CENTER);
export const InjectNotificationsService = () => Inject(NotificationsService);

// export const InjectNotificationTemplates = () => Inject(NOTIFICATION_TEMPLATES);