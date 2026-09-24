import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { Component, signal } from '@angular/core';
import { email, form, FormField, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatOption } from '@angular/material/core';
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
import { MatSelect } from '@angular/material/select';

@Component({
  selector: 'account-settings',
  imports: [
    CdkTextareaAutosize,
    MatButton,
    MatFormField,
    MatIcon,
    MatInput,
    MatLabel,
    MatOption,
    MatPrefix,
    MatSelect,
    FormField,
    MatDivider,
    MatHint,
    MatError,
  ],
  templateUrl: './account.html',
})
export default class AccountSettings {
  // State
  protected accountSettingsModel = signal({
    name: 'Brian Hughes',
    username: 'brian',
    title: 'Senior Frontend Developer',
    company: 'YXZ Software',
    about:
      "Hey! This is Brian; husband, father and gamer. I'm mostly passionate about bleeding edge tech and chocolate! 🍫",
    email: 'brian@example.com',
    phone: '121-490-33-12',
    country: 'usa',
    language: 'english',
  });
  protected accountSettingsForm = form(this.accountSettingsModel, (schema) => {
    required(schema.name, { message: 'Name is required' });

    required(schema.email, { message: 'Email is required' });
    email(schema.email, { message: 'Invalid email address' });
  });

  save(event: Event) {
    event.preventDefault();
  }
}
