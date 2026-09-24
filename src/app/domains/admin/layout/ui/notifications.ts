import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { formatDistance } from 'date-fns';
import { es } from 'date-fns/locale';
import { NotificationItem } from '@/app/core/api/api.service';
import { NotificationsService } from '@/app/core/notifications/notifications.service';

@Component({
  selector: 'notifications',
  imports: [
    NgClass,
    MatIconButton,
    MatIcon,
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    MatButton,
    MatDivider,
  ],
  templateUrl: './notifications.html',
})
export class Notifications {
  // State
  private now = new Date();
  private service = inject(NotificationsService);
  protected notificationsService = this.service;
  protected open = signal(false);
  protected onlyUnread = signal(false);

  // Data
  protected visibleNotifications = computed(() =>
    this.onlyUnread()
      ? this.service.notifications().filter(notification => !notification.leida)
      : this.service.notifications()
  );

  toggle(force: boolean | null = null) {
    this.open.update(value => {
      const next = force === null ? !value : force;
      if (next) this.service.load();
      return next;
    });
  }

  activate(notification: NotificationItem) {
    this.service.open(notification);
    this.toggle(false);
  }

  markAllRead() {
    this.service.markAllRead();
  }

  timeAgo(time: string) {
    return formatDistance(new Date(time), this.now, { addSuffix: true, locale: es });
  }
}
