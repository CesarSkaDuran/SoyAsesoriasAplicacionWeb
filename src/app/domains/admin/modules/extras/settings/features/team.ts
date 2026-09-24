import { TitleCasePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatOption } from '@angular/material/core';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatInput } from '@angular/material/input';
import { MatSelect, MatSelectTrigger } from '@angular/material/select';

@Component({
  selector: 'team-settings',
  imports: [
    FormsModule,
    MatFormField,
    MatIcon,
    MatIconButton,
    MatInput,
    MatButton,
    MatDivider,
    MatOption,
    MatSelect,
    MatSelectTrigger,
    TitleCasePipe,
  ],
  templateUrl: './team.html',
})
export default class TeamSettings {
  // State
  protected roles = [
    {
      label: 'Read',
      value: 'read',
      description:
        'Can read and clone this repository. Can also open and comment on issues and pull requests.',
    },
    {
      label: 'Write',
      value: 'write',
      description:
        'Can read, clone, and push to this repository. Can also manage issues and pull requests.',
    },
    {
      label: 'Admin',
      value: 'admin',
      description:
        'Can read, clone, and push to this repository. Can also manage issues, pull requests, and repository settings, including adding collaborators.',
    },
  ];
  protected members = [
    {
      id: '1',
      photo: '/images/photos/male-01.jpg',
      name: 'Dejesus Michael',
      email: 'dejesusmichael@mail.org',
      role: 'admin',
    },
    {
      id: '2',
      photo: '/images/photos/male-03.jpg',
      name: 'Mclaughlin Steele',
      email: 'mclaughlinsteele@mail.me',
      role: 'admin',
    },
    {
      id: '3',
      photo: null,
      name: 'Laverne Dodson',
      email: 'lavernedodson@mail.ca',
      role: 'write',
    },
    {
      id: '4',
      photo: '/images/photos/female-03.jpg',
      name: 'Trudy Berg',
      email: 'trudyberg@mail.us',
      role: 'read',
    },
    {
      id: '5',
      photo: '/images/photos/male-07.jpg',
      name: 'Lamb Underwood',
      email: 'lambunderwood@mail.me',
      role: 'read',
    },
    {
      id: '6',
      photo: '/images/photos/male-08.jpg',
      name: 'Mcleod Wagner',
      email: 'mcleodwagner@mail.biz',
      role: 'read',
    },
    {
      id: '7',
      photo: '/images/photos/female-07.jpg',
      name: 'Shannon Kennedy',
      email: 'shannonkennedy@mail.ca',
      role: 'read',
    },
  ];
}
