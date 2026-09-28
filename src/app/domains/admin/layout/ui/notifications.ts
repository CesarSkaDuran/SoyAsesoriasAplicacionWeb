import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { formatDistance } from 'date-fns';
import { es } from 'date-fns/locale';
import { NotificationItem } from '@/app/core/api/api.service';
import {
  NOTIFICATION_TONES,
  notificationsSoundEnabled,
  notificationsTone,
  notificationsVolume,
  NotificationTone,
  playNotificationSound,
  setNotificationsSoundEnabled,
  setNotificationsTone,
  setNotificationsVolume,
} from '@/app/core/notifications/notification-sound';
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
    MatMenuModule,
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
  protected soundOn = signal(notificationsSoundEnabled());
  protected soundVolume = signal(Math.round(notificationsVolume() * 100));
  protected soundTone = signal<NotificationTone>(notificationsTone());
  protected tones = NOTIFICATION_TONES;

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

  toggleSound() {
    const next = !this.soundOn();
    this.soundOn.set(next);
    setNotificationsSoundEnabled(next);
    if (next) playNotificationSound();
  }

  selectTone(tone: NotificationTone) {
    this.soundTone.set(tone);
    setNotificationsTone(tone);
    playNotificationSound(tone);
  }

  onVolumeInput(event: Event) {
    const value = Number((event.target as HTMLInputElement).value);
    this.soundVolume.set(value);
    setNotificationsVolume(value / 100);
  }

  previewSound() {
    playNotificationSound();
  }

  timeAgo(time: string) {
    return formatDistance(new Date(time), this.now, { addSuffix: true, locale: es });
  }
}
