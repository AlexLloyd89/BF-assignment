import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { AuthService } from './services/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatSlideToggleModule, MatIconModule, MatButtonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  public themeSvc = inject(ThemeService);
  public authSvc = inject(AuthService);
  private router = inject(Router);

  toggleTheme() {
    this.themeSvc.setTheme(!this.themeSvc.isDarkValue$());
  }

  logout() {
    this.router.navigate(['/']);
    this.authSvc.logout();
  }
}
