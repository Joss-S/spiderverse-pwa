import { Injectable, computed, signal } from '@angular/core';

/** Almacena los héroes favoritos del usuario en localStorage (señales reactivas). */
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly storageKey = 'spiderman-pwa:favorites';

  readonly ids = signal<number[]>(this.read());
  readonly count = computed(() => this.ids().length);

  isFavorite(id: number): boolean {
    return this.ids().includes(id);
  }

  toggle(id: number): void {
    this.ids.update((ids) =>
      ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]
    );
    this.persist();
  }

  remove(id: number): void {
    this.ids.update((ids) => ids.filter((item) => item !== id));
    this.persist();
  }

  clear(): void {
    this.ids.set([]);
    this.persist();
  }

  private read(): number[] {
    try {
      const raw = localStorage.getItem(this.storageKey) ?? '[]';
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'number') : [];
    } catch {
      return [];
    }
  }

  private persist(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.ids()));
  }
}
