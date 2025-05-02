import { Component } from '@angular/core';
import { HomeComponent } from './components/home/home.component';
import { FooterComponent } from './components/footer/footer.component';

@Component({
  selector: 'app-root',
  template: '<app-home></app-home>',
  standalone: true,
  imports: [HomeComponent, FooterComponent]
})
export class AppComponent {
  title = 'object-counter';
}
