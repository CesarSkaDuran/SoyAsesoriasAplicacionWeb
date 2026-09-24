import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'error-404',
  imports: [MatButton, RouterLink],
  templateUrl: './error-404.html',
})
export default class Error404 {}
