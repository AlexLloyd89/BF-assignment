import {
  AfterViewInit,
  Component,
  effect,
  ElementRef,
  input,
  Input,
  model,
  OnDestroy,
  output,
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
import { BehaviorSubject, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DetailDisplayComponent } from '../../components/detail-display/detail-display';

@Component({
  selector: 'app-connect',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
    DetailDisplayComponent,
  ],
  templateUrl: './connect.html',
  styleUrl: './connect.scss',
})
export class ConnectComponent implements AfterViewInit, OnDestroy {
  detailUser$ = model<(GitHubDetailUser & { type: NodeType }) | null>(null);

  @Input() formControl!: FormControl<string>;
  filteredOptions$ = input<GitHubSearchUser[]>([]);
  graphData$ = input<{ nodes: GraphNode[]; links: GraphLink[] }>();

  connectionsEmitter = output<void>();
  userSelectedEmitter = output<GitHubSearchUser>();
  navigateEmitter = output<string>();

  resizeObserver$!: ResizeObserver;
  resizeSubject$ = new BehaviorSubject(0);

  @ViewChild('graph', { static: true }) graphSvgref!: ElementRef<SVGElement>;

  constructor() {
    effect(() => {
      const data = this.graphData$();
      if (data?.nodes?.length && data?.links?.length) {
        this.renderGraph(data);
      }
    });

    this.resizeSubject$
      .pipe(debounceTime(350), takeUntilDestroyed())
      .subscribe(() => {
        const data = this.graphData$();
        if (data) this.renderGraph(data);
      });
  }

  ngAfterViewInit() {
    const container = this.graphSvgref.nativeElement.parentElement;
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

  renderGraph(graph: { nodes: GraphNode[]; links: GraphLink[] }) {
    const container = this.graphSvgref.nativeElement.parentElement;
    if (!container) return;

    const { width, height } = container.getBoundingClientRect();
    d3.select(this.graphSvgref.nativeElement).selectAll('*').remove();

    const svg = d3
      .select(this.graphSvgref.nativeElement)
      .attr('width', width)
      .attr('height', height);

    const graphGroup = svg.append('g');

    const simulation = d3
      .forceSimulation<GraphNode>(graph.nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphLink>(graph.links)
          .id((d) => d.id)
          .distance(100)
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(40));

    const link = graphGroup
      .append('g')
      .attr('stroke', '#aaa')
      .selectAll('line')
      .data(graph.links)
      .enter()
      .append('line')
      .attr('stroke', (d) =>
        d.relationship === LinkType.MUTUAL
          ? '#9c27b0'
          : d.relationship === LinkType.FOLLOWER
          ? '#1f77b4'
          : '#ff7f0e'
      )
      .attr('stroke-width', 2);

    // Group all nodes in <g> for easier transform
    const nodeGroup = graphGroup
      .append('g')
      .selectAll('g')
      .data(graph.nodes)
      .enter()
      .append('g')
      .on('click', (event: PointerEvent, node: GraphNode) => {
        if (!node?.data) return;
        this.detailUser$.set({
          ...node.data,
          type: node.type,
        } as GitHubDetailUser & { type: NodeType });
      })
      .call(
        d3
          .drag<SVGGElement, any>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      );

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.25, 4])
      .on('zoom', (event) => {
        graphGroup.attr('transform', event.transform.toString());
      });

    svg.call(zoom as any);

    // Center node with avatar image
    nodeGroup
      .filter((d) => d.type === 'center')
      .append('image')
      .attr('xlink:href', (d) => d.avatarUrl || '')
      .attr('width', 40)
      .attr('height', 40)
      .attr('x', -20)
      .attr('y', -20);

    // Follower and following group nodes as colored circles
    nodeGroup
      .filter((d) => d.type !== 'center')
      .append('circle')
      .attr('r', 16)
      .attr('fill', (d) =>
        d.type === NodeType.FOLLOWER
          ? '#1f77b4'
          : d.type === NodeType.FOLLOWING
          ? '#ff7f0e'
          : d.type === NodeType.MUTUAL
          ? '#9c27b0'
          : '#999'
      );

    // Tooltips
    nodeGroup.append('title').text((d) => {
      if (d.type !== NodeType.CENTER) {
        if (d.data) return d.id;
        return d.followersCount
          ? `Followers -  ${d.followersCount}`
          : `Following -  ${d.followingCount}`;
      }
      return `${d.id}\nFollowers: ${d.followersCount}\nFollowing: ${d.followingCount}`;
    });

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
        .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
        .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
        .attr('y2', (d) => (d.target as GraphNode).y ?? 0);

      nodeGroup.attr('transform', (d) => `translate(${d.x ?? 0}, ${d.y ?? 0})`);
    });

    function dragstarted(event: { active?: number }, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: PointerEvent, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: { active?: number }, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }
}
