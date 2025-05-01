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
  private detectionLine = { y: 240 }; // Línea horizontal en el medio de la imagen (480/2)
  private processedObjects = new Set<string>();

  objectCount$ = this.objectCount.asObservable();
  isModelLoaded$ = this.isModelLoaded.asObservable();

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
    }
  }

  private async loadModel() {
    try {
      console.log('Cargando modelo COCO-SSD...');
      await tf.setBackend('webgl');
      console.log('Backend actual:', tf.getBackend());
      
      this.model = await cocoSsd.load({
        base: 'lite_mobilenet_v2'
      });
      
      console.log('Modelo COCO-SSD cargado correctamente');
      this.isModelLoaded.next(true);
    } catch (error) {
      console.error('Error cargando el modelo:', error);
      this.isModelLoaded.next(false);
    }
  }

  async detectObjects(videoElement: HTMLVideoElement) {
    if (!this.model || !this.isModelLoaded.value) {
      return [];
    }

    try {
      const predictions = await this.model.detect(videoElement);
      const filteredPredictions = this.filterRelevantObjects(predictions);
      this.processNewDetections(filteredPredictions);
      return filteredPredictions;
    } catch (error) {
      console.error('Error detectando objetos:', error);
      return [];
    }
  }

  private filterRelevantObjects(predictions: any[]) {
    // Filtramos objetos que podrían ser bisagras (ajustar según las detecciones reales)
    return predictions.filter(pred => 
      ['scissors', 'knife', 'metal', 'tool'].includes(pred.class.toLowerCase()) ||
      pred.score > 0.5 // Mantenemos objetos con alta confianza
    );
  }

  private processNewDetections(currentDetections: any[]) {
    // Procesamos solo objetos que cruzan la línea de detección
    for (const detection of currentDetections) {
      const objectId = `${detection.bbox.join(',')}-${detection.class}`;
      const objectCenterY = detection.bbox[1] + (detection.bbox[3] / 2);

      // Verificamos si el objeto está cruzando la línea de detección
      if (Math.abs(objectCenterY - this.detectionLine.y) < 10 && !this.processedObjects.has(objectId)) {
        this.accumulatedCount++;
        this.processedObjects.add(objectId);
        this.objectCount.next(this.accumulatedCount);
        console.log(`Nuevo objeto detectado. Total: ${this.accumulatedCount}`);
      }
    }

    // Limpiamos objetos procesados que ya no están en la escena
    this.cleanProcessedObjects(currentDetections);
  }

  private cleanProcessedObjects(currentDetections: any[]) {
    // Convertimos las detecciones actuales a IDs
    const currentIds = new Set(currentDetections.map(d => 
      `${d.bbox.join(',')}-${d.class}`
    ));

    // Limpiamos objetos que ya no están en la escena
    for (const processedId of this.processedObjects) {
      if (!currentIds.has(processedId)) {
        this.processedObjects.delete(processedId);
      }
    }
  }

  getAccumulatedCount(): number {
    return this.accumulatedCount;
  }

  resetCount() {
    this.accumulatedCount = 0;
    this.processedObjects.clear();
    this.objectCount.next(0);
    console.log('Contador reiniciado');
  }

  setDetectionLine(y: number) {
    this.detectionLine.y = y;
  }
}
