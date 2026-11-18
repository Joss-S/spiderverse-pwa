import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, catchError, map, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HeroService } from '../../core/services/hero.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { Hero } from '../../core/models/hero.model';
import { LoadingStateComponent } from '../../shared/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../shared/error-state/error-state.component';

@Component({
  selector: 'app-hero-detail',
  standalone: true,
  imports: [RouterLink, LoadingStateComponent, ErrorStateComponent],
  templateUrl: './hero-detail.component.html',
  styleUrl: './hero-detail.component.scss',
})
export class HeroDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly heroService = inject(HeroService);
  readonly favorites = inject(FavoritesService);

  readonly hero = signal<Hero | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('id'))),
        tap(() => {
          this.loading.set(true);
          this.error.set('');
        }),
        switchMap((id) =>
          this.heroService.getHero(id).pipe(
            catchError((err: Error) => {
              this.error.set(err.message);
              this.loading.set(false);
              return EMPTY;
            })
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe((hero) => {
        this.hero.set(hero);
        this.loading.set(false);
      });
  }
}
