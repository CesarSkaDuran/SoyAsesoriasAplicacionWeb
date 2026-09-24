import { Component } from '@angular/core';
import { Navigation } from '@/app/domains/admin/layout/ui/navigation';
import { User } from '@/app/domains/admin/layout/ui/user';

@Component({
  selector: 'admin-sidebar',
  imports: [Navigation, User],
  host: {
    class: 'flex w-full flex-auto flex-col',
  },
  templateUrl: './sidebar.html',
})
export class AdminSidebar {}
