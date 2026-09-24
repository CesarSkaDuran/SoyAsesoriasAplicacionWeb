import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/list';
import { MatSlideToggle } from '@angular/material/slide-toggle';

@Component({
  selector: 'notifications-settings',
  imports: [FormsModule, MatButton, MatDivider, MatSlideToggle, FormField],
  templateUrl: './notifications.html',
})
export default class NotificationsSettings {
  // State
  protected notificationsSettingsModel = signal({
    communication: true,
    security: true,
    meetups: false,
    comments: false,
    mention: true,
    follow: true,
    inquiry: true,
  });
  protected notificationsSettingsForm = form(this.notificationsSettingsModel);

  save(event: Event) {
    event.preventDefault();
  }
}
