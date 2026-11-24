/**
 * Cola de fotos del panel: comprime y sube de pocas en pocas, para que quince
 * fotos de golpe no dejen sin memoria al Safari del iPhone. Si una falla, se
 * reintenta sola esa, sin perder las demás.
 *
 * Es una clase y no estado de React porque las subidas siguen su curso aunque
 * la pantalla se vuelva a pintar; las pantallas la leen con `useSyncExternalStore`.
 */
import { AdminApiError, uploadPhoto } from "@/lib/adminApi";
import { UnreadablePhotoError, compressPhoto } from "@/lib/photos";

export type UploadStatus = "waiting" | "preparing" | "uploading" | "failed" | "unreadable";

export interface UploadItem {
  id: string;
  name: string;
  status: UploadStatus;
  /** De 0 a 1 mientras sube. */
  progress: number;
  /** La foto ya comprimida, para enseñarla mientras sube. */
  previewUrl?: string;
  error?: string;
}

export interface UploadSnapshot {
  items: UploadItem[];
  /** Fotos de esta tanda (desde que no quedaba ninguna por subir) y cuántas han subido ya. */
  batchTotal: number;
  batchDone: number;
  /** Copia local de cada foto ya subida, para no descargarla otra vez al enseñarla. */
  previews: Record<string, string>;
}

/** Cuántas fotos suben a la vez. Se comprimen de una en una. */
const AT_ONCE = 2;

const EMPTY: UploadSnapshot = { items: [], batchTotal: 0, batchDone: 0, previews: {} };

export function isPending(item: UploadItem) {
  return item.status === "waiting" || item.status === "preparing" || item.status === "uploading";
}

export class PhotoUploadQueue {
  private snapshot: UploadSnapshot = EMPTY;
  private busy = false;
  private listeners = new Set<() => void>();
  private waiting: string[] = [];
  private files = new Map<string, File>();
  private ready = new Map<string, Blob>();
  private running = 0;
  private decoding: Promise<unknown> = Promise.resolve();
  private lastId = 0;

  constructor(private readonly onUploaded: (url: string) => void) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => EMPTY;

  /** Si queda alguna foto por subir: mientras tanto no se puede guardar. */
  isBusy = () => this.busy;
  isBusyOnServer = () => false;

  add(files: File[]) {
    if (files.length === 0) return;
    const items: UploadItem[] = files.map((file) => {
      const id = `foto-${++this.lastId}`;
      this.files.set(id, file);
      this.waiting.push(id);
      return { id, name: file.name, status: "waiting", progress: 0 };
    });
    this.update((s) => {
      const fresh = !s.items.some(isPending);
      return {
        ...s,
        items: [...s.items, ...items],
        batchTotal: (fresh ? 0 : s.batchTotal) + items.length,
        batchDone: fresh ? 0 : s.batchDone,
      };
    });
    this.pump();
  }

  retry(id: string) {
    const item = this.snapshot.items.find((i) => i.id === id);
    if (!item || item.status !== "failed") return;
    this.waiting.push(id);
    this.update((s) => {
      const fresh = !s.items.some(isPending);
      return {
        ...s,
        items: s.items.map((i) =>
          i.id === id ? { ...i, status: "waiting", progress: 0, error: undefined } : i,
        ),
        batchTotal: (fresh ? 0 : s.batchTotal) + 1,
        batchDone: fresh ? 0 : s.batchDone,
      };
    });
    this.pump();
  }

  /** Quita una foto que no ha podido subir. */
  discard(id: string) {
    const item = this.snapshot.items.find((i) => i.id === id);
    if (!item || isPending(item)) return;
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    this.files.delete(id);
    this.ready.delete(id);
    this.update((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));
  }

  /** Suelta la memoria de las copias locales al salir de la pantalla. */
  dispose() {
    for (const item of this.snapshot.items) {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    }
    for (const url of Object.values(this.snapshot.previews)) URL.revokeObjectURL(url);
    this.snapshot = EMPTY;
  }

  private update(change: (s: UploadSnapshot) => UploadSnapshot) {
    this.snapshot = change(this.snapshot);
    this.busy = this.snapshot.items.some(isPending);
    this.listeners.forEach((listener) => listener());
  }

  private patch(id: string, values: Partial<UploadItem>) {
    this.update((s) => ({
      ...s,
      items: s.items.map((i) => (i.id === id ? { ...i, ...values } : i)),
    }));
  }

  private pump() {
    while (this.running < AT_ONCE && this.waiting.length > 0) {
      const id = this.waiting.shift()!;
      this.running++;
      void this.run(id).finally(() => {
        this.running--;
        this.pump();
      });
    }
  }

  /** Descomprimir una foto grande ocupa mucha memoria: de una en una, aunque suban dos a la vez. */
  private oneAtATime<T>(task: () => Promise<T>): Promise<T> {
    const result = this.decoding.then(task);
    this.decoding = result.catch(() => undefined);
    return result;
  }

  private async run(id: string) {
    const item = this.snapshot.items.find((i) => i.id === id);
    if (!item) return;

    let photo = this.ready.get(id);
    if (!photo) {
      const file = this.files.get(id);
      if (!file) return;
      this.patch(id, { status: "preparing" });
      try {
        photo = await this.oneAtATime(() => compressPhoto(file));
      } catch (e) {
        this.patch(
          id,
          e instanceof UnreadablePhotoError
            ? { status: "unreadable", error: e.message }
            : { status: "failed", error: "No se ha podido preparar." },
        );
        return;
      }
      this.files.delete(id);
      this.ready.set(id, photo);
      this.patch(id, { previewUrl: URL.createObjectURL(photo) });
    }

    this.patch(id, { status: "uploading", progress: 0 });
    try {
      const url = await uploadPhoto(photo, item.name, (progress) => this.patch(id, { progress }));
      const previewUrl = this.snapshot.items.find((i) => i.id === id)?.previewUrl;
      this.ready.delete(id);
      this.update((s) => ({
        ...s,
        items: s.items.filter((i) => i.id !== id),
        batchDone: s.batchDone + 1,
        previews: previewUrl ? { ...s.previews, [url]: previewUrl } : s.previews,
      }));
      this.onUploaded(url);
    } catch (e) {
      this.patch(id, {
        status: "failed",
        error: e instanceof AdminApiError ? e.message : "No se ha podido subir.",
      });
    }
  }
}
