import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Inicio | Spider-Verse PWA',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'heroes',
    title: 'Héroes | Spider-Verse PWA',
    loadComponent: () =>
      import('./features/heroes/heroes.component').then((m) => m.HeroesComponent),
  },
  {
    path: 'heroes/:id',
    title: 'Detalle | Spider-Verse PWA',
    loadComponent: () =>
      import('./features/hero-detail/hero-detail.component').then(
        (m) => m.HeroDetailComponent
      ),
  },
  {
    path: 'favoritos',
    title: 'Favoritos | Spider-Verse PWA',
    loadComponent: () =>
      import('./features/favorites/favorites.component').then(
        (m) => m.FavoritesComponent
      ),
  },
  {
    path: 'alertas',
    title: 'Alertas | Spider-Verse PWA',
    loadComponent: () =>
      import('./features/missions/missions.component').then(
        (m) => m.MissionsComponent
      ),
  },
  { path: '**', redirectTo: '' },

];
