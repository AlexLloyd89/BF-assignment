import { DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private document = inject(DOCUMENT);
  private isDark$ = signal<boolean>(false);
  public isDarkValue$ = this.isDark$.asReadonly();

  constructor() {
    effect(() => {
      const isDark = this.isDark$();
      if (isDark) {
        this.removeStyle('light-theme');
        this.document.documentElement.classList.remove('light-theme');

        const href = 'dark-theme.css';
        getLinkElementForKey('dark-theme').setAttribute('href', href);
        this.document.documentElement.classList.add('dark-theme');
      } else {
        this.removeStyle('dark-theme');
        this.document.documentElement.classList.remove('dark-theme');

        const href = 'light-theme.css';
        getLinkElementForKey('light-theme').setAttribute('href', href);
        this.document.documentElement.classList.add('light-theme');
      }
    });
  }

  public setTheme(isDark: boolean): void {
    this.isDark$.set(isDark);
  }

  removeStyle(key: string) {
    const existingLinkElement = getExistingLinkElementByKey(key);
    if (existingLinkElement) {
      this.document.head.removeChild(existingLinkElement);
    }
  }
}

function createLinkElementWithKey(key: string) {
  const linkEl = document.createElement('link');
  linkEl.setAttribute('rel', 'stylesheet');
  linkEl.classList.add(getClassNameForKey(key));
  document.head.appendChild(linkEl);
  return linkEl;
}

function getClassNameForKey(key: string) {
  return `style-manager-${key}`;
}

function getLinkElementForKey(key: string) {
  return getExistingLinkElementByKey(key) || createLinkElementWithKey(key);
}

function getExistingLinkElementByKey(key: string) {
  return document.head.querySelector(
    `link[rel="stylesheet"].${getClassNameForKey(key)}`
  );
}
