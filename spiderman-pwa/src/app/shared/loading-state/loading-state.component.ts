import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  template: `
    <p class="loading" role="status">{{ label() }}</p>
  `,
  styles: [
    `
      .loading {
        text-align: center;
        padding: 48px 16px;
        color: #8491ae;
        font-size: 14px;
      }
    `,
  ],
})
export class LoadingStateComponent {
  readonly label = input('Cargando…');
}
