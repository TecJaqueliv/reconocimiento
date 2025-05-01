import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ObjectDetectionService } from '../../services/object-detection.service';

@Component({
  selector: 'app-camera-detector',
  templateUrl: './camera-detector.component.html',
  styleUrls: ['./camera-detector.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class CameraDetectorComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('video') video!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvas!: ElementRef<HTMLCanvasElement>;

  private stream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  objectCount: number = 0;
  isModelLoaded: boolean = false;
  error: string = '';

  constructor(private objectDetectionService: ObjectDetectionService) {}

  ngOnInit() {
    this.objectDetectionService.objectCount$.subscribe(count => {
      this.objectCount = count;
    });

    this.objectDetectionService.isModelLoaded$.subscribe(loaded => {
      this.isModelLoaded = loaded;
      if (loaded) {
        console.log('Modelo cargado correctamente');
      }
    });
  }

  ngAfterViewInit() {
    const canvas = this.canvas.nativeElement;
    canvas.width = 640;
    canvas.height = 480;
  }

  async startCamera() {
    try {
      this.error = '';
      console.log('Solicitando permisos de cámara...');
      
      const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
      console.log('Estado de permisos:', permissions.state);

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'environment'
        },
        audio: false
      });

      console.log('Permisos de cámara concedidos');
      
      const videoElement = this.video.nativeElement;
      videoElement.srcObject = this.stream;
      
      await new Promise<void>((resolve) => {
        videoElement.onloadedmetadata = () => {
          videoElement.play().then(() => {
            console.log('Video iniciado');
            resolve();
          }).catch(err => {
            console.error('Error al reproducir el video:', err);
            this.error = 'Error al iniciar la reproducción del video';
          });
        };
      });

      this.detectFrame();
    } catch (error: any) {
      console.error('Error al acceder a la cámara:', error);
      if (error.name === 'NotAllowedError') {
        this.error = 'Acceso a la cámara denegado. Por favor, permite el acceso a la cámara en tu navegador.';
      } else if (error.name === 'NotFoundError') {
        this.error = 'No se encontró ninguna cámara. Por favor, conecta una cámara y vuelve a intentarlo.';
      } else {
        this.error = `Error al acceder a la cámara: ${error.message || 'Error desconocido'}`;
      }
    }
  }

  private async detectFrame() {
    if (!this.video.nativeElement || !this.stream) return;

    if (this.video.nativeElement.readyState === this.video.nativeElement.HAVE_ENOUGH_DATA) {
      const predictions = await this.objectDetectionService.detectObjects(this.video.nativeElement);
      this.drawFrame(predictions);
    }

    this.animationFrameId = requestAnimationFrame(() => this.detectFrame());
  }

  private drawFrame(predictions: any[]) {
    const ctx = this.canvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Limpiar el canvas
    ctx.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);

    // Dibujar el frame actual del video
    ctx.drawImage(
      this.video.nativeElement,
      0, 0,
      this.canvas.nativeElement.width,
      this.canvas.nativeElement.height
    );

    // Dibujar la línea de detección
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.moveTo(0, this.canvas.nativeElement.height / 2);
    ctx.lineTo(this.canvas.nativeElement.width, this.canvas.nativeElement.height / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Dibujar las detecciones
    predictions.forEach(prediction => {
      const [x, y, width, height] = prediction.bbox;
      
      // Dibujar el rectángulo de detección
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      
      // Dibujar la etiqueta
      ctx.fillStyle = '#00ff00';
      ctx.font = '16px Arial';
      ctx.fillText(`${prediction.class} (${Math.round(prediction.score * 100)}%)`, x, y > 10 ? y - 5 : 10);
    });
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    const ctx = this.canvas.nativeElement.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
    }
  }

  resetCounter() {
    this.objectDetectionService.resetCount();
  }

  ngOnDestroy() {
    this.stopCamera();
  }
} 