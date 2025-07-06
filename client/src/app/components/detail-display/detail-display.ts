import { Component, effect, input, output } from '@angular/core';
import {
  GitHubDetailUser,
  GitHubSearchUser,
  NodeType,
} from '../../models/app.model';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-detail-display',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, NgClass],
  templateUrl: './detail-display.html',
  styleUrl: './detail-display.scss',
})
export class DetailDisplayComponent {
  detailUser$ = input.required<GitHubDetailUser & { type: NodeType }>();
  closeEmitter = output<void>();
  connectionsEmitter = output<void>();
  navigateEmitter = output<string>();
  setUserEmitter = output<GitHubSearchUser>();
}
