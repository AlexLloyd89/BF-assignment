import { Component, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-landing',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class LandingComponent {
  fb = inject(FormBuilder);

  loading$ = input<boolean>();

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submitEmitter = output<{ email: string; password: string }>();

  handleSubmit() {
    if (this.form.invalid && !this.loading$()) return;
    const value = this.form.value as { email: string; password: string };
    this.submitEmitter.emit(value);
  }
}
