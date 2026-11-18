import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { Hero } from '../models/hero.model';

/**
 * Capa de datos: consume la API REST pública Superhero API.
 * https://akabab.github.io/superhero-api/
 * Mantiene una caché en memoria para evitar peticiones repetidas y
 * normaliza los errores para que los componentes puedan mostrarlos.
 */
@Injectable({ providedIn: 'root' })
export class HeroService {
  private readonly http = inject(HttpClient);
  private readonly api = 'https://akabab.github.io/superhero-api/api';
  private cache: Hero[] | null = null;

  //Obtiene el listado completo de héroes
  getHeroes(): Observable<Hero[]> {
    if (this.cache) {
      return of(this.cache);
    }
    return this.http.get<Hero[]>(`${this.api}/all.json`).pipe(
      tap((heroes) => (this.cache = heroes)),
      catchError(() =>
        throwError(
          () =>
            new Error(
              'No pudimos cargar la base de datos de héroes. Verifica tu conexión e inténtalo de nuevo.'
            )
        )
      )
    );
  }

  //Obtiene el detalle de un héroe por su identificador
  getHero(id: number): Observable<Hero> {
    return this.http.get<Hero>(`${this.api}/id/${id}.json`).pipe(
      catchError(() =>
        throwError(() => new Error(`No encontramos información del héroe #${id}.`))
      )
    );
  }

  //Héroes relacionados con el universo Spider-Man
  getSpiderVerse(): Observable<Hero[]> {
    return this.getHeroes().pipe(
      map((heroes) =>
        heroes.filter((hero) =>
          /spider|venom|carnage|scorpion/i.test(hero.name)
        )
      )
    );
  }

  //Devuelve un héroe del caché local, si ya fue cargado
  getCachedHero(id: number): Hero | undefined {
    return this.cache?.find((hero) => hero.id === id);
  }
}
