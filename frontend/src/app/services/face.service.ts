import { Injectable, signal } from '@angular/core';
import * as faceapi from '@vladmandic/face-api';

/**
 * Servicio de reconocimiento facial (segundo factor). Todo el cómputo ocurre
 * en el navegador con face-api.js: se detecta el rostro y se calcula su
 * descriptor (vector de 128 números). Solo ese vector viaja al servidor; nunca
 * la fotografía.
 */
@Injectable({ providedIn: 'root' })
export class FaceService {
  /**
   * Ubicación de los pesos del modelo. Por defecto se cargan desde el CDN de
   * jsDelivr. Para autohospedarlos (recomendado en producción), copia la carpeta
   * `model` de `@vladmandic/face-api` a `frontend/public/models` y cambia esta
   * constante a `/models`.
   */
  private readonly MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

  readonly ready = signal(false);
  readonly loading = signal(false);
  private loadPromise: Promise<void> | null = null;

  /** Carga (una sola vez) los modelos de detección, landmarks y reconocimiento. */
  loadModels(): Promise<void> {
    if (this.ready()) return Promise.resolve();
    if (this.loadPromise) return this.loadPromise;

    this.loading.set(true);
    this.loadPromise = (async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri(this.MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(this.MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(this.MODEL_URL);
      this.ready.set(true);
      this.loading.set(false);
    })().catch((e) => {
      this.loading.set(false);
      this.loadPromise = null;
      throw e;
    });

    return this.loadPromise;
  }

  /** Enciende la cámara frontal y la vincula al elemento <video>. */
  async startCamera(video: HTMLVideoElement): Promise<MediaStream> {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 480, height: 360 },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    return stream;
  }

  /** Apaga la cámara y libera el stream. */
  stopCamera(video: HTMLVideoElement | null, stream: MediaStream | null): void {
    stream?.getTracks().forEach((t) => t.stop());
    if (video) video.srcObject = null;
  }

  /**
   * Detecta un único rostro en la fuente y devuelve su descriptor (128 floats),
   * o `null` si no se detecta una cara clara.
   */
  async detectDescriptor(
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  ): Promise<Float32Array | null> {
    await this.loadModels();
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
    const result = await faceapi
      .detectSingleFace(input, options)
      .withFaceLandmarks()
      .withFaceDescriptor();
    return result?.descriptor ?? null;
  }

  /** Convierte un descriptor a arreglo plano para enviarlo al backend. */
  toArray(descriptor: Float32Array): number[] {
    return Array.from(descriptor);
  }
}
