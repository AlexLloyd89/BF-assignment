/// <reference lib="webworker" />

import { tree } from 'd3';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  SimulationNodeDatum,
  SimulationLinkDatum,
} from 'd3-force';

interface GraphNode extends SimulationNodeDatum {
  id: string;
  type?: string;
  avatarUrl?: string;
  followersCount?: number;
  followingCount?: number;
  data?: any;
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  relationship?: string;
}

interface InitMessage {
  type: 'init';
  payload: {
    nodes: GraphNode[];
    links: GraphLink[];
    width: number;
    height: number;
  };
}

interface TickMessage {
  type: 'tick';
  nodes: GraphNode[];
  links: GraphLink[];
}

interface DragMessage {
  type: 'drag';
  payload: { id: string; fx: number; fy: number };
}

interface KickMessage {
  type: 'kick';
  alpha: number;
}

interface DragEndMessage {
  type: 'end';
  payload: { id: string };
}

type IncomingMessage = InitMessage | DragMessage | DragEndMessage | KickMessage;

let simulation: d3.Simulation<any, any>;

addEventListener('message', ({ data }: { data: IncomingMessage }) => {
  switch (data.type) {
    case 'init': {
      const { nodes, links, width, height } = data.payload;

      simulation = forceSimulation<GraphNode>(nodes)
        .force(
          'link',
          forceLink<GraphNode, GraphLink>(links)
            .id((d) => d.id)
            .distance(100)
        )
        .force('charge', forceManyBody().strength(-50))
        .force('center', forceCenter(width / 2, height / 2))
        .force('collide', forceCollide().radius(35))
        .velocityDecay(0.4)
        .alpha(0.8)
        .alphaDecay(0.02)
        .on('tick', () => {
          postMessage({
            type: 'tick',
            nodes: simulation.nodes().map((n) => ({
              ...n,
              id: n.id,
              type: n.type,
              avatarUrl: n.avatarUrl,
              followersCount: n.followersCount,
              followingCount: n.followingCount,
              data: n.data,
              x: n.x,
              y: n.y,
              fx: n.fx,
              fy: n.fy,
            })),
            links: links.map((link) => ({
              ...link,
              source:
                typeof link.source === 'object' && 'id' in link.source
                  ? (link.source as GraphNode).id
                  : link.source,
              target:
                typeof link.target === 'object' && 'id' in link.target
                  ? (link.target as GraphNode).id
                  : link.target,
              relationship: link.relationship,
            })),
          });
        });
      break;
    }

    case 'kick':
      simulation.alpha(data.alpha).restart();
      break;

    case 'drag': {
      const { id, fx, fy } = data.payload;
      if (!simulation) return;
      const node = simulation.nodes().find((n) => n.id === id);
      if (node) {
        node.fx = fx;
        node.fy = fy;
      }
      break;
    }

    case 'end': {
      const { id } = data.payload;
      if (!simulation) return;
      const node = simulation.nodes().find((n) => n.id === id);
      if (node) {
        node.fx = null;
        node.fy = null;
      }
      break;
    }
  }
});
