import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeroService } from '../../core/services/hero.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { Hero } from '../../core/models/hero.model';
import { HeroCardComponent } from '../../shared/hero-card/hero-card.component';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../shared/error-state/error-state.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterLink,
    HeroCardComponent,
    LoadingStateComponent,
    ErrorStateComponent,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  private readonly heroService = inject(HeroService);
  readonly favorites = inject(FavoritesService);

  readonly spiderVerse = signal<Hero[]>([]);
  readonly spotlight = signal<Hero | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.heroService.getHeroes().subscribe({
      next: (heroes) => {
        this.spotlight.set(heroes.find((h) => h.id === 620) ?? heroes[0]);
        this.spiderVerse.set(
          heroes.filter((h) => /spider|venom|carnage/i.test(h.name)).slice(0, 4)
        );
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
