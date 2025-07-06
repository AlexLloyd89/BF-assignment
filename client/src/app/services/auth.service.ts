import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<{ id: string; email: string } | null>(null);

  public user$ = this._user.asReadonly();

  public login(user: { id: string; email: string }) {
    this._user.set(user);
  }

  public logout() {
    this._user.set(null);
  }
}
