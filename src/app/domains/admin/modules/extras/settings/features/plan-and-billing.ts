import { CurrencyPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatOption } from '@angular/material/core';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import {
  MatFormField,
  MatInput,
  MatLabel,
  MatPrefix,
} from '@angular/material/input';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { MatSelect } from '@angular/material/select';

@Component({
  selector: 'plan-and-billing-settings',
  imports: [
    CurrencyPipe,
    FormsModule,
    MatButton,
    MatFormField,
    MatIcon,
    MatInput,
    MatLabel,
    MatOption,
    MatPrefix,
    MatRadioButton,
    MatRadioGroup,
    MatSelect,
    FormField,
    MatCard,
    MatDivider,
  ],
  templateUrl: './plan-and-billing.html',
})
export default class PlanAndBillingSettings {
  // State
  protected planAndBillingSettingsModel = signal({
    plan: 'team',
    cardHolder: 'Brian Hughes',
    cardNumber: '',
    cardExpiration: '',
    cardCVC: '',
    country: 'usa',
    zip: '',
  });
  protected planAndBillingSettingsForm = form(this.planAndBillingSettingsModel);
  protected plans = [
    {
      value: 'basic',
      label: 'BASIC',
      details: 'Starter plan for individuals.',
      price: '10',
    },
    {
      value: 'team',
      label: 'TEAM',
      details: 'Collaborate up to 10 people.',
      price: '20',
    },
    {
      value: 'enterprise',
      label: 'ENTERPRISE',
      details: 'For bigger businesses.',
      price: '40',
    },
  ];

  save(event: Event) {
    event.preventDefault();
  }
}
