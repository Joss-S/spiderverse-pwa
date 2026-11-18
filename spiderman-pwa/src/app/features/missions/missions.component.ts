import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PushService } from '../../core/services/push.service';

@Component({
  selector: 'app-missions',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './missions.component.html',
  styleUrl: './missions.component.scss',
})
export class MissionsComponent implements OnInit {
  readonly push = inject(PushService);

  readonly title = signal('Nueva misión disponible');
  readonly body = signal('Abre la aplicación para ver los detalles.');

  ngOnInit(): void {
    void this.push.checkServer();
  }

  async send(): Promise<void> {
    if (!this.title().trim() || !this.body().trim()) return;

    // El primer clic en "Enviar" sirve también para activar las notificaciones,
    // así no hace falta mostrar ningún botón de suscripción.
    if (!this.push.subscribed()) {
      await this.push.subscribe();
      if (!this.push.subscribed()) return;
    }

    await this.push.sendAlert({
      title: this.title().trim(),
      body: this.body().trim(),
      url: '/',
    });
  }
}
