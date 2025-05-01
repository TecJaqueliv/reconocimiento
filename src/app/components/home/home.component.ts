import { Component } from '@angular/core';
import { CameraDetectorComponent } from '../camera-detector/camera-detector.component';
import { WeightEstimatorComponent } from '../weight-estimator/weight-estimator.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [CameraDetectorComponent, WeightEstimatorComponent]
})
export class HomeComponent {
  // No necesitamos lógica adicional aquí por ahora
} 