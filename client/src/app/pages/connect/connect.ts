import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  Input,
  model,
  OnDestroy,
  output,
  signal,
  ViewChild,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {
  GitHubDetailUser,
  GitHubSearchUser,
  GraphLink,
  GraphNode,
  LinkType,
  NodeType,
} from '../../models/app.model';
import * as d3 from 'd3';
import { BehaviorSubject, debounceTime, skip } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DetailDisplayComponent } from '../../components/detail-display/detail-display';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ForceComponent } from '../../components/force/force';

@Component({
  selector: 'app-connect',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
    DetailDisplayComponent,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    ForceComponent,
  ],
  templateUrl: './connect.html',
  styleUrl: './connect.scss',
})
export class ConnectComponent implements AfterViewInit, OnDestroy {
  showOverlay$ = computed(
    () => this.loading$() || !this.graphData$()?.nodes?.length
  );
  svgSize$ = signal<{ width: number; height: number }>({
    width: 100,
    height: 100,
  });

  detailUser$ = model<(GitHubDetailUser & { type: NodeType }) | null>(null);

  @Input() formControl!: FormControl<string>;
  filteredOptions$ = input<GitHubSearchUser[]>([]);
  loading$ = input<boolean>();
  searchLoading$ = input<boolean>();
  graphData$ = input<{ nodes: GraphNode[]; links: GraphLink[] }>();

  connectionsEmitter = output<void>();
  userSelectedEmitter = output<GitHubSearchUser>();
  navigateEmitter = output<string>();

  resizeObserver$!: ResizeObserver;
  resizeSubject$ = new BehaviorSubject(0);


  @ViewChild('container', { static: true })
  graphSvgref!: ElementRef<HTMLDivElement>;

  constructor() {
    this.resizeSubject$
      .pipe(debounceTime(350), takeUntilDestroyed())
      .subscribe(() => {
        const { width, height } =
          this.graphSvgref.nativeElement?.getBoundingClientRect();
        this.svgSize$.set({ width, height });
      });
  }

  ngAfterViewInit() {
    const container = this.graphSvgref.nativeElement;
    if (!container) return;
    this.resizeObserver$ = new ResizeObserver(() => {
      this.resizeSubject$.next(this.resizeSubject$.value + 1);
    });
    this.resizeObserver$.observe(container);
  }

  ngOnDestroy() {
    this.resizeObserver$?.disconnect();
  }

  displayFn(user: GitHubSearchUser): string {
    return user?.displayName || '';
  }

}
