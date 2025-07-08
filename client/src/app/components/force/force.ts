import {
  Component,
  effect,
  ElementRef,
  input,
  output,
  untracked,
  ViewChild,
} from '@angular/core';
import {
  GraphNode,
  GraphLink,
  LinkType,
  GitHubDetailUser,
  NodeType,
} from '../../models/app.model';

import * as d3 from 'd3';

@Component({
  selector: 'app-force',
  imports: [],
  templateUrl: './force.html',
  styleUrl: './force.scss',
})
export class ForceComponent {
  simState: {
    worker: Worker;
    nodes: GraphNode[];
    links: GraphLink[];
    width: number;
    height: number;
  } | null = null;

  graphData$ = input<{ nodes: GraphNode[]; links: GraphLink[] }>();
  svgSize$ = input<{ width: number; height: number }>({
    width: 100,
    height: 100,
  });

  detailUserEmitter = output<(GitHubDetailUser & { type: NodeType }) | null>();

  @ViewChild('graph', { static: true }) graphSvgref!: ElementRef<SVGElement>;

  constructor() {
    effect(() => {
      const data = this.graphData$();
      if (!data) return;
      const svgSize = untracked(() => this.svgSize$());
      this.renderGraph(data, svgSize);
    });
  }

  renderGraph(
    graph: { nodes: GraphNode[]; links: GraphLink[] },
    size: { width: number; height: number }
  ) {
    const { width, height } = size;
    d3.select(this.graphSvgref.nativeElement).selectAll('*').remove();

    const svg = d3
      .select(this.graphSvgref.nativeElement)
      .attr('width', width)
      .attr('height', height);

    const graphGroup = svg.append('g');

    const drag = d3
      .drag<SVGGElement, GraphNode>()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);

    const link = graphGroup
      .append('g')
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
        this.detailUserEmitter.emit({
          ...node.data,
          type: node.type,
        } as GitHubDetailUser & { type: NodeType });
      })
      .call(drag);

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

    const worker = new Worker(new URL('./force.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.postMessage({
      type: 'init',
      payload: {
        nodes: graph.nodes,
        links: graph.links,
        width,
        height,
      },
    });

    this.simState = {
      worker,
      nodes: graph.nodes,
      links: graph.links,
      width,
      height,
    };

    let lastUpdate = 0;
    const MIN_INTERVAL = 30; // ms

    worker.onmessage = ({ data }) => {
      const now = performance.now();
      if (now - lastUpdate < MIN_INTERVAL) return;

      lastUpdate = now;

      if (data.type !== 'tick') return;

      const updatedNodes = data.nodes;
      const updatedLinks = data.links;

      // Create a map of node id -> node object for quick lookup
      const nodeById = new Map(updatedNodes.map((n: GraphNode) => [n.id, n]));

      // Replace link source and target IDs with node objects
      const resolvedLinks = updatedLinks.map((link: GraphLink) => ({
        ...link,
        source:
          typeof link.source === 'string'
            ? nodeById.get(link.source)
            : link.source,
        target:
          typeof link.target === 'string'
            ? nodeById.get(link.target)
            : link.target,
      }));

      // Update D3 selections with nodes and resolved links:
      nodeGroup
        .data(updatedNodes, (d: GraphNode) => d.id)
        .attr('transform', (d) => `translate(${d.x ?? 0}, ${d.y ?? 0})`);

      link
        .data(resolvedLinks)
        .attr('x1', (d: any) => d.source?.x ?? 0)
        .attr('y1', (d: any) => d.source?.y ?? 0)
        .attr('x2', (d: any) => d.target?.x ?? 0)
        .attr('y2', (d: any) => d.target?.y ?? 0);
    };

    // Drag event handlers communicate with worker
    function dragstarted(event: PointerEvent, d: GraphNode) {
      worker.postMessage({
        type: 'drag',
        payload: { id: d.id, fx: d.x, fy: d.y },
      });
    }

    function dragged(event: PointerEvent, d: GraphNode) {
      worker.postMessage({
        type: 'drag',
        payload: { id: d.id, fx: event.x, fy: event.y },
      });
    }

    function dragended(event: PointerEvent, d: GraphNode) {
      worker.postMessage({
        type: 'end',
        payload: { id: d.id },
      });
    }
  }
}
