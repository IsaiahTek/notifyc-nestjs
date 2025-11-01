// ============================================================================
// REST API CONTROLLER
// ============================================================================

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get(':userId')
  async getNotifications(
    @Param('userId') userId: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const filters: NotificationFilters = {
      ...(status && { status: status as any }),
      ...(type && { type }),
      ...(category && { category }),
      ...(limit && { limit: parseInt(limit) }),
      ...(offset && { offset: parseInt(offset) })
    };

    return this.notificationsService.getForUser(userId, filters);
  }

  @Get(':userId/unread-count')
  async getUnreadCount(@Param('userId') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { count };
  }

  @Get(':userId/stats')
  async getStats(@Param('userId') userId: string) {
    return this.notificationsService.getStats(userId);
  }

  @Get(':userId/preferences')
  async getPreferences(@Param('userId') userId: string) {
    return this.notificationsService.getPreferences(userId);
  }

  @Put(':userId/preferences')
  async updatePreferences(
    @Param('userId') userId: string,
    @Body() preferences: Partial<NotificationPreferences>
  ) {
    await this.notificationsService.updatePreferences(userId, preferences);
    return { success: true };
  }

  @Post()
  async sendNotification(@Body() input: NotificationInput) {
    return this.notificationsService.send(input);
  }

  @Post('batch')
  async sendBatch(@Body() inputs: NotificationInput[]) {
    return this.notificationsService.sendBatch(inputs);
  }

  @Post(':id/read')
  async markAsRead(@Param('id') id: string) {
    await this.notificationsService.markAsRead(id);
    return { success: true };
  }

  @Post(':userId/read-all')
  async markAllAsRead(@Param('userId') userId: string) {
    await this.notificationsService.markAllAsRead(userId);
    return { success: true };
  }

  @Delete(':id')
  async deleteNotification(@Param('id') id: string) {
    await this.notificationsService.delete(id);
    return { success: true };
  }

  @Delete(':userId/all')
  async deleteAll(@Param('userId') userId: string) {
    await this.notificationsService.deleteAll(userId);
    return { success: true };
  }

  @Get('health')
  async health() {
    return this.notificationsService.healthCheck();
  }
}