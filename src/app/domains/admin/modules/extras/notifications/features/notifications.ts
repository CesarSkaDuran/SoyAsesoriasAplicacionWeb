import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'notifications',
  imports: [MatButton, MatIcon],
  templateUrl: './notifications.html',
})
export default class Notifications {}
