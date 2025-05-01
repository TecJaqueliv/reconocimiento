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

  constructor(private objectDetectionService: ObjectDetectionService) {}

  ngOnInit() {
    this.objectDetectionService.objectCount$.subscribe(count => {
      this.cameraCount = count;
      this.calculateDifference();
    });
  }

  onWeightChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.totalWeight = parseFloat(input.value) || 0;
    this.estimatedCount = Math.round(this.totalWeight / this.WEIGHT_PER_HINGE);
    this.calculateDifference();
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
} 