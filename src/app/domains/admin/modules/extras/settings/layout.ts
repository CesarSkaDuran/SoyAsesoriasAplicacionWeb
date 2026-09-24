import { Component, inject } from '@angular/core';
import { MatFormField } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatTabLink, MatTabNav, MatTabNavPanel } from '@angular/material/tabs';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';

@Component({
  selector: 'settings-layout',
  imports: [
    RouterOutlet,
    MatTabNav,
    MatTabLink,
    MatTabNavPanel,
    RouterLink,
    RouterLinkActive,
    MatFormField,
    MatSelect,
    MatOption,
  ],
  templateUrl: './layout.html',
})
export default class SettingsLayout {
  // Dependencies
  protected router = inject(Router);

  // State
  protected links = [
    {
      id: 'account',
      label: 'Account',
      route: '/admin/settings/account',
    },
    {
      id: 'security',
      label: 'Security',
      route: '/admin/settings/security',
    },
    {
      id: 'plan-and-billing',
      label: 'Plan and Billing',
      route: '/admin/settings/plan-and-billing',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      route: '/admin/settings/notifications',
    },
    {
      id: 'team',
      label: 'Team',
      route: '/admin/settings/team',
    },
  ];
}
