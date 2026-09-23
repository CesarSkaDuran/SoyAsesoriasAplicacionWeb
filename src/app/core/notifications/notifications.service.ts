import { isPlatformBrowser } from '@angular/common';
import { effect, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { io, Socket } from 'socket.io-client';
import { ApiService, NotificationItem } from '@/app/core/api/api.service';
import { CredentialsService } from '@/app/core/authentication/credentials.service';
import { environment } from '@/environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private api = inject(ApiService);
  private credentials = inject(CredentialsService);
  private platformId = inject(PLATFORM_ID);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);
  private socket: Socket | null = null;
  private socketToken: string | null = null;
  private socketUserId: number | null = null;
  private activityVersion = 0;
  private toastedNotifications = new Set<number>();

  readonly notifications = signal<NotificationItem[]>([]);
  readonly unreadCount = signal(0);

  constructor() {
    effect(() => {
      const credentials = this.credentials.credentialsState();
      const token = credentials?.access_token ?? null;
      const userId = credentials?.user.id ?? null;
      if (!isPlatformBrowser(this.platformId)) return;

      if (!token) {
        this.disconnect();
        this.socketUserId = null;
        this.toastedNotifications.clear();
        this.notifications.set([]);
        this.unreadCount.set(0);
        return;
      }
      if (userId !== this.socketUserId) {
        this.toastedNotifications.clear();
        this.notifications.set([]);
        this.unreadCount.set(0);
        this.activityVersion++;
      }
      if (token === this.socketToken && this.socket) return;

      this.disconnect();
      this.socketToken = token;
      this.socketUserId = userId;
      const socketUrl = environment.serverUrl.replace(/\/api\/?$/, '');
      const socket = io(socketUrl, { auth: { token } });
      this.socket = socket;
      socket.on('notification:new', (notification: NotificationItem) => this.receive(notification));
      socket.on('connect', () => this.load());
      this.load();
    });
  }

  load() {
    if (!isPlatformBrowser(this.platformId)) return;
    const activityVersion = this.activityVersion;
    this.api.notificaciones().subscribe({
      next: ({ data, unread_count }) => {
        const merged = new Map<number, NotificationItem>();
        for (const item of [...data, ...this.notifications()]) merged.set(item.id, item);
        this.notifications.set([...merged.values()].sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ).slice(0, 50));
        if (activityVersion === this.activityVersion) this.unreadCount.set(unread_count);
      },
      error: () => {},
    });
  }

  markRead(notification: NotificationItem) {
    if (notification.leida) return;
    this.api.markNotificationRead(notification.id).subscribe({
      next: () => {
        this.activityVersion++;
        this.notifications.update(items => items.map(item =>
          item.id === notification.id ? { ...item, leida: true } : item
        ));
        this.unreadCount.update(count => Math.max(0, count - 1));
      },
    });
  }

  markAllRead() {
    if (!this.unreadCount()) return;
    this.api.markAllNotificationsRead().subscribe({
      next: () => {
        this.activityVersion++;
        this.notifications.update(items => items.map(item => ({ ...item, leida: true })));
        this.unreadCount.set(0);
      },
    });
  }

  open(notification: NotificationItem) {
    this.markRead(notification);
    if (notification.url) void this.router.navigateByUrl(notification.url);
  }

  private receive(notification: NotificationItem) {
    const exists = this.notifications().some(item => item.id === notification.id);
    if (!exists) {
      this.activityVersion++;
      this.notifications.update(items => [notification, ...items].slice(0, 50));
      if (!notification.leida) this.unreadCount.update(count => count + 1);
    }
    if (notification.leida || this.toastedNotifications.has(notification.id)) return;
    this.toastedNotifications.add(notification.id);
    this.snackBar.open(notification.titulo || notification.mensaje || 'Nueva notificación', 'Ver', {
      duration: 7000,
    }).onAction().subscribe(() => {
      this.open(notification);
    });
  }

  private disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.socketToken = null;
  }
}
