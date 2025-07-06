import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { LandingComponent } from './landing';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing-container',
  imports: [LandingComponent],
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
    `,
  ],
  template: `
    <app-landing
      [loading$]="loading$()"
      (submitEmitter)="handleSubmit($event)"
    ></app-landing>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingContainer {
  private authSvc = inject(AuthService);
  private router = inject(Router);
  loading$ = signal<boolean>(false);

  handleSubmit(data: { email: string; password: string }) {
    this.loading$.set(true);
    //Simulate a login process
    setTimeout(() => {
      this.authSvc.login({ id: crypto.randomUUID(), email: data.email });
      this.router.navigate(['/connect']);
      this.loading$.set(false);
    }, 2000);
  }
}
