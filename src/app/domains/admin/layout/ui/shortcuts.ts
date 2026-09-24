import {
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MatBadge } from '@angular/material/badge';
import { MatIconButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuTrigger } from '@angular/material/menu';
import { MatTooltip } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { LocalStorage } from '@/app/core/local-storage';
import { Media } from '@/app/core/media';
import {
  NAVIGATION,
  NavigationItem,
} from '@/app/domains/admin/layout/data/navigation';

const STORAGE_KEY = 'shortcuts';
const DEFAULT_SHORTCUTS = [
  'dashboards/project',
  'general/contacts',
  'general/tasks',
];

@Component({
  selector: 'shortcuts',
  imports: [
    MatIcon,
    MatIconButton,
    MatMenu,
    MatMenuTrigger,
    MatTooltip,
    MatDivider,
    RouterLink,
    MatBadge,
  ],
  host: {
    class: 'flex items-center',
  },
  templateUrl: './shortcuts.html',
})
export class Shortcuts {
  // Dependencies
  private localStorage = inject(LocalStorage);
  private media = inject(Media);

  // State
  protected search = signal('');
  protected bookmarks = signal<string[]>(this.restoreBookmarks());
  protected items = NAVIGATION.flatMap((group) => group.children ?? []).filter(
    (item) => !!item.route
  );
  protected bookmarkedItems = computed(() =>
    this.bookmarks()
      .map((id) => this.items.find((item) => item.id === id))
      .filter((item): item is NavigationItem => !!item)
  );
  protected visibleBookmarks = computed(() =>
    this.bookmarkedItems().slice(0, 5)
  );
  protected overflowCount = computed(
    () => this.bookmarkedItems().length - this.visibleBookmarks().length
  );
  protected isMobile = computed(() => this.media.match(`(max-width: 639px)`)());
  protected badgeCount = computed(() =>
    this.isMobile() ? this.bookmarkedItems().length : this.overflowCount()
  );
  protected badgeLabel = computed(() =>
    this.isMobile() ? `${this.badgeCount()}` : `+${this.badgeCount()}`
  );
  protected filteredItems = computed(() => {
    const search = this.search().trim().toLowerCase();

    // Filter by the search term
    if (search) {
      return this.items.filter((item) =>
        item.label.toLowerCase().includes(search)
      );
    }

    // Otherwise, pin the bookmarked items to the top
    return [
      ...this.bookmarkedItems(),
      ...this.items.filter((item) => !this.isBookmarked(item.id)),
    ];
  });
  protected firstUnbookmarkedId = computed(() => {
    if (this.search().trim() || !this.bookmarkedItems().length) {
      return null;
    }

    return this.items.find((item) => !this.isBookmarked(item.id))?.id ?? null;
  });

  // DOM
  private searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  /**
   * Reads the stored bookmarks, falling back to the defaults.
   */
  private restoreBookmarks(): string[] {
    const stored = this.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return DEFAULT_SHORTCUTS;
    }

    try {
      return JSON.parse(stored) as string[];
    } catch {
      return DEFAULT_SHORTCUTS;
    }
  }

  isBookmarked(id: string) {
    return this.bookmarks().includes(id);
  }

  toggleBookmark(id: string) {
    this.bookmarks.update((bookmarks) =>
      bookmarks.includes(id)
        ? bookmarks.filter((bookmark) => bookmark !== id)
        : [...bookmarks, id]
    );

    this.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.bookmarks()));
  }

  focusSearch() {
    setTimeout(() => this.searchInput()?.nativeElement.focus());
  }
}
