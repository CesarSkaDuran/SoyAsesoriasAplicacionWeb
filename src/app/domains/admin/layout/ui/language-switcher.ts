import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIconButton } from '@angular/material/button';
import { MatPseudoCheckbox } from '@angular/material/core';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { LangDefinition, TranslocoService } from '@jsverse/transloco';

@Component({
  selector: 'language-switcher',
  imports: [
    MatIconButton,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    MatPseudoCheckbox,
  ],
  templateUrl: './language-switcher.html',
})
export class LanguageSwitcher {
  // Dependencies
  private readonly transloco = inject(TranslocoService);

  // State
  protected activeLang = this.transloco.getActiveLang();
  protected readonly availableLangs =
    this.transloco.getAvailableLangs() as LangDefinition[];

  constructor() {
    this.transloco.langChanges$.pipe(takeUntilDestroyed()).subscribe((lang) => {
      this.activeLang = lang;
    });
  }

  setActiveLang(lang: string) {
    this.transloco.setActiveLang(lang);
  }

  getLangFlag(lang: string) {
    switch (lang) {
      case 'en': {
        return 'US';
      }
      case 'es': {
        return 'ES';
      }
      default: {
        return 'US';
      }
    }
  }
}
