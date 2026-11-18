import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeroService } from '../../core/services/hero.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { Hero } from '../../core/models/hero.model';
import { HeroCardComponent } from '../../shared/hero-card/hero-card.component';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../shared/error-state/error-state.component';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [
    RouterLink,
    HeroCardComponent,
    LoadingStateComponent,
    ErrorStateComponent,
  ],
  templateUrl: './favorites.component.html',
  styleUrl: './favorites.component.scss',
})
export class FavoritesComponent implements OnInit {
  private readonly heroService = inject(HeroService);
  readonly favorites = inject(FavoritesService);

  readonly heroes = signal<Hero[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly favoriteHeroes = computed(() => {
    const ids = this.favorites.ids();
    return this.heroes().filter((hero) => ids.includes(hero.id));
  });

  ngOnInit(): void {
    if (this.favorites.count() === 0) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.heroService.getHeroes().subscribe({
      next: (heroes) => {
        this.heroes.set(heroes);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  toggleFavorite(id: number): void {
    this.favorites.toggle(id);
  }
}
