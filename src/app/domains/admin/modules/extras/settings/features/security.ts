import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField, required, validate } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import {
  MatError,
  MatFormField,
  MatHint,
  MatInput,
  MatLabel,
  MatPrefix,
} from '@angular/material/input';
import { MatSlideToggle } from '@angular/material/slide-toggle';

@Component({
  selector: 'security-settings',
  imports: [
    FormsModule,
    MatButton,
    MatFormField,
    MatIcon,
    MatInput,
    MatLabel,
    MatPrefix,
    MatSlideToggle,
    MatDivider,
    FormField,
    MatHint,
    MatError,
  ],
  templateUrl: './security.html',
})
export default class SecuritySettings {
  // State
  protected securitySettingsModel = signal({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
    twoStep: true,
    askPasswordChange: false,
  });
  protected securitySettingsForm = form(
    this.securitySettingsModel,
    (schema) => {
      // Require current password when new password and confirm password are set
      required(schema.currentPassword, {
        when: ({ valueOf }) =>
          valueOf(schema.newPassword) !== '' &&
          valueOf(schema.confirmNewPassword) !== '',
        message: 'Current password is required to change password.',
      });

      // Require confirm new password when new password is set
      required(schema.confirmNewPassword, {
        when: ({ valueOf }) => valueOf(schema.newPassword) !== '',
        message: 'Please confirm your new password.',
      });

      // Match new password and confirm new password
      validate(schema.confirmNewPassword, ({ value, valueOf }) => {
        const confirmPassword = value();
        const password = valueOf(schema.newPassword);

        if (confirmPassword !== password) {
          return {
            kind: 'passwordMismatch',
            message: 'New password and confirmation do not match.',
          };
        }

        return null;
      });
    }
  );

  save(event: Event) {
    event.preventDefault();
  }
}
