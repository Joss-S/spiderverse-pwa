import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Hero } from '../../core/models/hero.model';

@Component({
  selector: 'app-hero-card',
  standalone: true,
  imports: [RouterLink],
  template: `
    <article class="card">
      <img [src]="hero().images.md" [alt]="hero().name" loading="lazy" />
      <div class="body">
        <h3>{{ hero().name }}</h3>
        <p>{{ hero().biography.fullName }}</p>
        <div class="row">
          <a [routerLink]="['/heroes', hero().id]">Ver perfil</a>
          <button type="button" (click)="toggleFavorite.emit(hero().id)">
            {{ isFavorite() ? 'Quitar' : 'Guardar' }}
          </button>
        </div>
      </div>
    </article>
  `,
  styles: [
    `
      :host { display: block; }
      .card {
        background: #121a30;
        border: 1px solid #26304a;
        border-radius: 6px;
        overflow: hidden;
        height: 100%;
      }
      .card:hover { border-color: #e62429; }
      img { width: 100%; height: 210px; object-fit: cover; object-position: top; display: block; }
      .body { padding: 12px; }
      h3 { margin: 0 0 2px; color: #fff; font-size: 16px; }
      p { margin: 0 0 12px; color: #8491ae; font-size: 13px; }
      .row { display: flex; justify-content: space-between; align-items: center; }
      a { color: #6ea8ff; font-size: 13px; text-decoration: none; }
      a:hover { text-decoration: underline; }
      button {
        background: none;
        border: 1px solid #3a4767;
        color: #b6c0d6;
        border-radius: 4px;
        padding: 5px 9px;
        font-size: 12px;
        cursor: pointer;
      }
      button:hover { border-color: #e62429; color: #fff; }
    `,
  ],
})
export class HeroCardComponent {
  readonly hero = input.required<Hero>();
  readonly isFavorite = input(false);
  readonly toggleFavorite = output<number>();
}
