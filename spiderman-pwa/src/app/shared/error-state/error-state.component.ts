import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-state',
  standalone: true,
  template: `
    <div class="error-box" role="alert">
      <p>{{ message() }}</p>
      <button type="button" (click)="retry.emit()">Reintentar</button>
    </div>
  `,
  styles: [
    `
      .error-box {
        max-width: 460px;
        margin: 24px auto;
        padding: 20px;
        text-align: center;
        border: 1px solid #e62429;
        border-radius: 6px;
        background: rgba(230, 36, 41, .05);
      }
      p { margin: 0 0 12px; color: #d9dfec; font-size: 14px; line-height: 1.5; }
      button {
        background: #e62429;
        border: 0;
        color: #fff;
        padding: 8px 16px;
        border-radius: 4px;
        font-size: 13px;
        cursor: pointer;
      }
      button:hover { background: #c91c21; }
    `,
  ],
})
export class ErrorStateComponent {
  readonly message = input('Ocurrió un error.');
  readonly retry = output<void>();
}
