import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeroService } from '../../core/services/hero.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { Hero } from '../../core/models/hero.model';
import { HeroCardComponent } from '../../shared/hero-card/hero-card.component';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../shared/error-state/error-state.component';

type Filter = 'all' | 'spider' | 'marvel';
type Sort = 'name' | 'power' | 'strength';

@Component({
  selector: 'app-heroes',
  standalone: true,
  imports: [
    FormsModule,
    HeroCardComponent,
    LoadingStateComponent,
    ErrorStateComponent,
  ],
  templateUrl: './heroes.component.html',
  styleUrl: './heroes.component.scss',
})
export class HeroesComponent implements OnInit {
  private readonly heroService = inject(HeroService);
  readonly favorites = inject(FavoritesService);

  readonly heroes = signal<Hero[]>([]);
  readonly search = signal('');
  readonly filter = signal<Filter>('all');
  readonly sort = signal<Sort>('name');
  readonly loading = signal(true);
  readonly error = signal('');

  readonly filteredHeroes = computed(() => {
    const term = this.search().trim().toLowerCase();
    const filter = this.filter();
    const sort = this.sort();

    let list = this.heroes().filter((hero) => {
      const matchesTerm =
        !term ||
        hero.name.toLowerCase().includes(term) ||
        hero.biography.fullName.toLowerCase().includes(term);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'spider' && /spider|venom|carnage/i.test(hero.name)) ||
        (filter === 'marvel' && /marvel/i.test(hero.biography.publisher));
      return matchesTerm && matchesFilter;
    });

    list = [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'power') return b.powerstats.power - a.powerstats.power;
      return b.powerstats.strength - a.powerstats.strength;
    });

    return list;
  });

  readonly visibleHeroes = computed(() => this.filteredHeroes().slice(0, 8));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    this.heroService.getHeroes().subscribe({
      next: (heroes) => {
        this.heroes.set(
          heroes.filter((hero) => !/dc comics/i.test(hero.biography.publisher))
        );
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  setFilter(filter: Filter): void {
    this.filter.set(filter);
  }

  toggleFavorite(id: number): void {
    this.favorites.toggle(id);
  }

  clearFilters(): void {
    this.search.set('');
    this.filter.set('all');
  }
}
