import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

@Injectable({
  providedIn: 'root'
})
export class ObjectDetectionService {
  private model: cocoSsd.ObjectDetection | null = null;
  private objectCount = new BehaviorSubject<number>(0);
  private isModelLoaded = new BehaviorSubject<boolean>(false);
  private accumulatedCount = 0;
  private lastDetectedObjects: any[] = [];
  private detectionLine = { y: 120 };
  private processedObjects = new Set<string>();
  private lastDetectionTime = 0;
  private readonly DETECTION_INTERVAL = 500;
  private readonly MIN_CONFIDENCE = 0.5; // Reducimos el umbral de confianza
  private loadingError = new BehaviorSubject<string>('');
  private detectionArea = {
    x: 0,
    y: 0,
    width: 320,
    height: 240
  };
  private debugInfo = new BehaviorSubject<string>('');
  private readonly DETECTION_ZONE_HEIGHT = 20; // Altura de la zona de detección

  objectCount$ = this.objectCount.asObservable();
  isModelLoaded$ = this.isModelLoaded.asObservable();
  loadingError$ = this.loadingError.asObservable();
  debugInfo$ = this.debugInfo.asObservable();

  constructor() {
    console.log('Inicializando servicio de detección de objetos...');
    this.initTensorFlow();
  }

  private async initTensorFlow() {
    try {
      console.log('Inicializando TensorFlow.js...');
      await tf.ready();
      console.log('TensorFlow.js inicializado correctamente');
      await this.loadModel();
    } catch (error) {
      console.error('Error inicializando TensorFlow:', error);
      this.isModelLoaded.next(false);
      this.loadingError.next('Error al inicializar TensorFlow: ' + (error as Error).message);
    }
  }

  private async loadModel() {
    try {
      console.log('Cargando modelo COCO-SSD...');
      
      try {
        await tf.setBackend('webgl');
        console.log('Usando backend WebGL');
      } catch (error) {
        console.log('WebGL no disponible, usando CPU');
        await tf.setBackend('cpu');
      }
      
      this.model = await cocoSsd.load({
        base: 'lite_mobilenet_v2'
      });
      
      console.log('Modelo COCO-SSD cargado correctamente');
      this.isModelLoaded.next(true);
      this.loadingError.next('');
    } catch (error) {
      console.error('Error cargando el modelo:', error);
      this.isModelLoaded.next(false);
      this.loadingError.next('Error al cargar el modelo: ' + (error as Error).message);
    }
  }

  async detectObjects(videoElement: HTMLVideoElement) {
    if (!this.model || !this.isModelLoaded.value) {
      return [];
    }

    const now = Date.now();
    if (now - this.lastDetectionTime < this.DETECTION_INTERVAL) {
      return this.lastDetectedObjects;
    }

    try {
      const canvas = document.createElement('canvas');
      canvas.width = this.detectionArea.width;
      canvas.height = this.detectionArea.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(
          videoElement,
          this.detectionArea.x,
          this.detectionArea.y,
          this.detectionArea.width,
          this.detectionArea.height,
          0,
          0,
          this.detectionArea.width,
          this.detectionArea.height
        );
      }

      const predictions = await this.model.detect(canvas);
      const filteredPredictions = this.filterRelevantObjects(predictions);
      
      // Actualizar información de depuración
      this.updateDebugInfo(predictions, filteredPredictions);
      
      this.processNewDetections(filteredPredictions);
      this.lastDetectedObjects = filteredPredictions;
      this.lastDetectionTime = now;
      return filteredPredictions;
    } catch (error) {
      console.error('Error detectando objetos:', error);
      return [];
    }
  }

  private filterRelevantObjects(predictions: any[]) {
    // Ampliamos la lista de objetos relevantes
    return predictions.filter(pred => {
      const relevantClasses = [
        'scissors', 'knife', 'metal', 'tool', 'book', 'bottle',
        'cup', 'fork', 'spoon', 'bowl', 'mouse', 'keyboard'
      ];
      return relevantClasses.includes(pred.class.toLowerCase()) &&
             pred.score > this.MIN_CONFIDENCE;
    });
  }

  private processNewDetections(currentDetections: any[]) {
    const debugMessages: string[] = [];
    debugMessages.push(`Procesando ${currentDetections.length} detecciones`);

    for (const detection of currentDetections) {
      const objectId = `${detection.bbox.join(',')}-${detection.class}`;
      const objectCenterY = detection.bbox[1] + (detection.bbox[3] / 2);
      const objectHeight = detection.bbox[3];

      // Verificamos si el objeto está en la zona de detección
      const isInDetectionZone = Math.abs(objectCenterY - this.detectionLine.y) < this.DETECTION_ZONE_HEIGHT;
      const isNewObject = !this.processedObjects.has(objectId);
      
      debugMessages.push(
        `Objeto: ${detection.class} (${Math.round(detection.score * 100)}%)`,
        `Centro Y: ${objectCenterY.toFixed(1)}, Altura: ${objectHeight.toFixed(1)}`,
        `En zona: ${isInDetectionZone}, Nuevo: ${isNewObject}`
      );

      if (isInDetectionZone && isNewObject) {
        this.accumulatedCount++;
        this.processedObjects.add(objectId);
        this.objectCount.next(this.accumulatedCount);
        debugMessages.push(`¡Nuevo objeto detectado! Total: ${this.accumulatedCount}`);
      }
    }

    // Limpiamos objetos procesados que ya no están en la escena
    this.cleanProcessedObjects(currentDetections);
    
    // Actualizamos la información de depuración
    this.updateDebugInfo(currentDetections, debugMessages);
  }

  private cleanProcessedObjects(currentDetections: any[]) {
    const currentIds = new Set(currentDetections.map(d => 
      `${d.bbox.join(',')}-${d.class}`
    ));

    // Solo limpiamos objetos que no están en la zona de detección
    for (const processedId of this.processedObjects) {
      const [x, y, width, height, className] = processedId.split('-');
      const objectCenterY = parseFloat(y) + (parseFloat(height) / 2);
      
      if (!currentIds.has(processedId) || 
          Math.abs(objectCenterY - this.detectionLine.y) > this.DETECTION_ZONE_HEIGHT * 2) {
        this.processedObjects.delete(processedId);
      }
    }
  }

  private updateDebugInfo(predictions: any[], debugMessages: string[]) {
    const debugText = [
      `Total detecciones: ${predictions.length}`,
      `Objetos procesados: ${this.processedObjects.size}`,
      `Contador acumulado: ${this.accumulatedCount}`,
      '--- Detalles de detección ---',
      ...debugMessages
    ].join('\n');
    
    this.debugInfo.next(debugText);
  }

  getAccumulatedCount(): number {
    return this.accumulatedCount;
  }

  resetCount() {
    this.accumulatedCount = 0;
    this.processedObjects.clear();
    this.objectCount.next(0);
    this.debugInfo.next('Contador reiniciado');
    console.log('Contador reiniciado');
  }

  setDetectionLine(y: number) {
    this.detectionLine.y = y;
    this.debugInfo.next(`Línea de detección ajustada a Y: ${y}`);
  }
}
