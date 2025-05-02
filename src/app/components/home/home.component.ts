import { Component } from '@angular/core';
import { CameraDetectorComponent } from '../camera-detector/camera-detector.component';
import { WeightEstimatorComponent } from '../weight-estimator/weight-estimator.component';
import { CommonModule } from '@angular/common';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [CameraDetectorComponent, WeightEstimatorComponent, CommonModule, FooterComponent]
})
export class HomeComponent {
  // No necesitamos lógica adicional aquí por ahora
} 