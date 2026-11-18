import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { fromEvent } from 'rxjs';
import { SwUpdate } from '@angular/service-worker';
import { FavoritesService } from './core/services/favorites.service';
import { PushService, AlertPayload } from './core/services/push.service';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly favorites = inject(FavoritesService);
  readonly push = inject(PushService);
  private readonly swUpdate = inject(SwUpdate);

  readonly online = signal(navigator.onLine);
  readonly menuOpen = signal(false);
  readonly canInstall = signal(false);
  readonly toast = signal<AlertPayload | null>(null);

  private installEvent: BeforeInstallPromptEvent | null = null;
  private toastTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    // Si hay una versión nueva, recargamos para no quedarnos con archivos viejos en caché.
    this.swUpdate.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        window.location.reload();
      }
    });

    fromEvent(window, 'online').subscribe(() => this.online.set(true));
    fromEvent(window, 'offline').subscribe(() => this.online.set(false));

    fromEvent(window, 'beforeinstallprompt').subscribe((event) => {
      event.preventDefault();
      this.installEvent = event as BeforeInstallPromptEvent;
      this.canInstall.set(true);
    });

    // Muestra un aviso en pantalla cuando llega una notificación con la app abierta.
    effect(() => {
      const alert = this.push.lastNotification();
      if (alert) {
        this.showToast(alert);
      }
    });
  }

  async installApp(): Promise<void> {
    if (!this.installEvent) return;
    await this.installEvent.prompt();
    await this.installEvent.userChoice;
    this.installEvent = null;
    this.canInstall.set(false);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  private showToast(alert: AlertPayload): void {
    this.toast.set(alert);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 6000);
  }
}
