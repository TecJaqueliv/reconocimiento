import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ObjectDetectionService } from '../../services/object-detection.service';

@Component({
  selector: 'app-weight-estimator',
  templateUrl: './weight-estimator.component.html',
  styleUrls: ['./weight-estimator.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class WeightEstimatorComponent implements OnInit {
  readonly WEIGHT_PER_HINGE = 200; // Peso en gramos por bisagra
  totalWeight: number = 0;
  estimatedCount: number = 0;
  cameraCount: number = 0;
  difference: number = 0;
  weightUnit: 'kg' | 'g' = 'kg'; // Unidad de peso seleccionada

  constructor(private objectDetectionService: ObjectDetectionService) {}

  ngOnInit() {
    this.objectDetectionService.objectCount$.subscribe(count => {
      this.cameraCount = count;
      this.calculateDifference();
    });
  }

  onWeightChange(value: string) {
    const numericValue = parseFloat(value) || 0;
    
    // Convertir a gramos si la entrada está en kg
    this.totalWeight = this.weightUnit === 'kg' ? numericValue * 1000 : numericValue;
    this.estimatedCount = Math.round(this.totalWeight / this.WEIGHT_PER_HINGE);
    this.calculateDifference();
  }

  onUnitChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.weightUnit = select.value as 'kg' | 'g';
    
    // Recalcular si ya hay un peso ingresado
    if (this.totalWeight > 0) {
      this.onWeightChange(this.totalWeight.toString());
    }
  }

  private calculateDifference() {
    this.difference = this.estimatedCount - this.cameraCount;
  }

  getExpectedWeight(): number {
    return this.cameraCount * this.WEIGHT_PER_HINGE;
  }

  getWeightDifference(): number {
    return this.totalWeight - this.getExpectedWeight();
  }

  // Convertir gramos a la unidad de visualización seleccionada
  getDisplayWeight(): number {
    return this.weightUnit === 'kg' ? this.totalWeight / 1000 : this.totalWeight;
  }

  // Convertir gramos a la unidad de visualización seleccionada
  getDisplayExpectedWeight(): number {
    const weight = this.getExpectedWeight();
    return this.weightUnit === 'kg' ? weight / 1000 : weight;
  }

  // Convertir gramos a la unidad de visualización seleccionada
  getDisplayWeightDifference(): number {
    const difference = this.getWeightDifference();
    return this.weightUnit === 'kg' ? difference / 1000 : difference;
  }

  // Obtener el símbolo de la unidad
  getWeightUnitSymbol(): string {
    return this.weightUnit;
  }
} 