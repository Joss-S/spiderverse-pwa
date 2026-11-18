import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Clave pública VAPID del servidor (par privado solo en el servidor). */
export const VAPID_PUBLIC_KEY =
  'BLrbKElI4v_mia-1nn6RGVg8kEWTGVuGVV2L_v386DA9wmAlxZDyOdRKStm8WFcbc4vnGicUnunVk-Q98Xo1cxk';

export const PUSH_SERVER_URL = environment.pushServerUrl;

export interface AlertPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

function withTimeout<T>(promise: Promise<T>, ms: number, error: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(error)), ms)),
  ]);
}

function toUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly swPush = inject(SwPush);
  private readonly http = inject(HttpClient);

  readonly supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    typeof Notification !== 'undefined';

  readonly permission = signal<NotificationPermission>(this.currentPermission());
  readonly subscribed = signal(false);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly isError = signal(false);
  readonly serverOnline = signal<boolean | null>(null);
  readonly lastNotification = signal<AlertPayload | null>(null);

  constructor() {
    this.swPush.messages.subscribe((raw: unknown) => {
      const data = (raw ?? {}) as Partial<AlertPayload>;
      const alert: AlertPayload = {
        title: data.title ?? 'Notificación',
        body: data.body ?? '',
        url: data.url,
      };
      this.lastNotification.set(alert);
      this.message.set(`Recibido: ${alert.title}`);
      this.isError.set(false);
    });
    void this.init();
  }

  private currentPermission(): NotificationPermission {
    return typeof Notification === 'undefined' ? 'default' : Notification.permission;
  }

  private say(text: string, error = false): void {
    this.message.set(text);
    this.isError.set(error);
  }

  private async init(): Promise<void> {
    await this.checkServer();
    await this.refreshSubscriptionStatus();
  }

  async checkServer(): Promise<void> {
    try {
      await firstValueFrom(this.http.get(`${PUSH_SERVER_URL}/api/health`));
      this.serverOnline.set(true);
    } catch {
      this.serverOnline.set(false);
    }
  }

  async refreshSubscriptionStatus(): Promise<void> {
    if (!this.supported) return;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      this.subscribed.set(!!sub);
      // Si el navegador ya tenía suscripción pero el servidor no, la registramos.
      if (sub) {
        try {
          await firstValueFrom(
            this.http.post(`${PUSH_SERVER_URL}/api/subscribe`, sub)
          );
        } catch {
          // El botón "Enviar" avisará si el servidor no está disponible.
        }
      }
    } catch {
      this.subscribed.set(false);
    }
  }

  /** Asegura que exista un Service Worker activo antes de suscribir. */
  private async ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      await navigator.serviceWorker.register('/ngsw-worker.js', { scope: '/' });
    }
    reg = await withTimeout(
      navigator.serviceWorker.ready,
      15000,
      'El Service Worker no se activó. Recarga la página e inténtalo de nuevo.'
    );
    return reg;
  }

  async subscribe(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.say('Preparando notificaciones…');

    try {
      if (!this.supported) {
        throw new Error('Este navegador no admite notificaciones push.');
      }

      const reg = await this.ensureServiceWorker();

      // Si ya existe suscripción en el navegador, solo la registramos en el servidor.
      let subscription = await reg.pushManager.getSubscription();

      if (!subscription) {
        let permission = Notification.permission;
        if (permission !== 'granted') {
          this.say('Esperando permiso del navegador…');
          permission = await withTimeout(
            Notification.requestPermission(),
            20000,
            'El permiso no fue respondido. Revísalo en la barra del navegador.'
          );
        }
        this.permission.set(permission);
        if (permission !== 'granted') {
          throw new Error(
            'Permiso denegado. Haz clic en el candado junto a la dirección y permite las notificaciones.'
          );
        }

        this.say('Creando suscripción…');
        try {
          subscription = await withTimeout(
            this.swPush.requestSubscription({ serverPublicKey: VAPID_PUBLIC_KEY }),
            20000,
            'SwPush no respondió'
          );
        } catch {
          subscription = await withTimeout(
            reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: toUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
            }),
            20000,
            'El navegador no pudo crear la suscripción.'
          );
        }
      }

      this.say('Registrando en el servidor…');
      await firstValueFrom(
        this.http.post(`${PUSH_SERVER_URL}/api/subscribe`, subscription)
      );

      this.subscribed.set(true);
      this.serverOnline.set(true);
      this.say('Notificaciones activadas.');
    } catch (error) {
      this.say(
        error instanceof Error ? error.message : 'No se pudo activar las notificaciones.',
        true
      );
    } finally {
      this.busy.set(false);
    }
  }

  async unsubscribe(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.say('Cancelando suscripción…');
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const subscription = await reg?.pushManager.getSubscription();
      await this.swPush.unsubscribe();
      if (subscription) {
        await firstValueFrom(
          this.http.post(`${PUSH_SERVER_URL}/api/unsubscribe`, {
            endpoint: subscription.endpoint,
          })
        );
      }
      this.subscribed.set(false);
      this.say('Suscripción cancelada.');
    } catch {
      this.say('No se pudo cancelar la suscripción.', true);
    } finally {
      this.busy.set(false);
    }
  }

  async sendAlert(payload: AlertPayload): Promise<boolean> {
    if (this.busy()) return false;
    this.busy.set(true);
    try {
      const result = await firstValueFrom(
        this.http.post<{ ok: boolean; sent: number }>(
          `${PUSH_SERVER_URL}/api/notify`,
          payload
        )
      );
      this.say(`Alerta enviada a ${result.sent} dispositivo(s).`);
      return true;
    } catch {
      this.say('No se pudo conectar con el servidor push.', true);
      return false;
    } finally {
      this.busy.set(false);
    }
  }
}
