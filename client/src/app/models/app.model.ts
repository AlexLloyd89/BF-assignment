import { SimulationNodeDatum } from 'd3-force';
import { SimulationLinkDatum } from 'd3-force';

export interface GitHubSearchUser {
  avatar: string;
  followersUrl: string;
  followingUrl: string;
  id: number;
  url: string;
  displayName: string;
}

export interface GithubSearchResponse {
  items: GithubRawUserSearchData[];
  incomplete_results: boolean;
  total_count: number;
}

export interface GithubRawUserSearchData {
  avatar_url: string;
  followers_url: string;
  following_url: string;
  id: number;
  login: string;
  bio: string;
  created_at: string;
  name: string;
  followers: number;
  following: number;
  html_url: string;
}

export interface GitHubDetailUser extends GitHubSearchUser {
  bio: string;
  createdAt: string;
  name: string;
  followers: number;
  following: number;
}

export interface GraphNode extends SimulationNodeDatum {
  id: string;
  type: NodeType;
  avatarUrl?: string;
  followersCount?: number;
  followingCount?: number;
  data?: GitHubDetailUser | GitHubSearchUser;
}

export interface GraphLink extends SimulationLinkDatum<GraphNode> {
  source: GraphNode | string;
  target: GraphNode | string;
  relationship: LinkType;
}

export enum NodeType {
  CENTER = 'center',
  FOLLOWER = 'follower',
  FOLLOWING = 'following',
  MUTUAL = 'mutual',
}

export enum LinkType {
  FOLLOWER = 'follower',
  FOLLOWING = 'following',
  MUTUAL = 'mutual',
}
