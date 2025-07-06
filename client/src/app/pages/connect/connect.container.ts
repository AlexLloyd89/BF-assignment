import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { ConnectComponent } from './connect';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  filter,
  debounceTime,
  switchMap,
  catchError,
  of,
  forkJoin,
} from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GithubService } from '../../services/github.service';
import { FormControl } from '@angular/forms';
import {
  GitHubDetailUser,
  GitHubSearchUser,
  GraphLink,
  GraphNode,
  LinkType,
  NodeType,
} from '../../models/app.model';

@Component({
  selector: 'app-connect-container',
  imports: [ConnectComponent],
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
    `,
  ],
  template: `<app-connect
    [detailUser$]="selectedUser$()"
    [formControl]="formControl"
    [filteredOptions$]="options$()"
    [graphData$]="graphData$()"
    (connectionsEmitter)="handleConnections()"
    (navigateEmitter)="handleGitHubNav($event)"
    (userSelectedEmitter)="loadGraphForUser($event)"
  ></app-connect> `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectContainer {
  private githubSvc = inject(GithubService);
  private snackBar = inject(MatSnackBar);
  formControl = new FormControl<string>('', { nonNullable: true });
  options$ = signal<GitHubSearchUser[]>([]);
  graphData$ = signal<{ nodes: GraphNode[]; links: GraphLink[] }>({
    nodes: [],
    links: [],
  });
  selectedUser$ = signal<(GitHubDetailUser & { type: NodeType }) | null>(null);

  constructor() {
    this.formControl.valueChanges
      .pipe(
        takeUntilDestroyed(),
        filter((value: string) => value?.length > 2),
        debounceTime(350),
        switchMap((value) =>
          this.githubSvc.searchUsers(value).pipe(
            catchError((err) => {
              this.snackBar.open(
                'Failed to fetch users from GitHub. Please try again later.',
                'Close',
                {
                  duration: 3000,
                }
              );
              console.error('GitHub search failed', err);
              return of([]);
            })
          )
        )
      )
      .subscribe((users) => {
        this.options$.set(users);
      });
  }

  handleGitHubNav(url: string) {
    window.open(url, '_blank');
  }

  loadGraphForUser(user: GitHubSearchUser) {
    this.githubSvc
      .getUserByUsername(user.displayName)
      .pipe(
        switchMap((userDetails: GitHubDetailUser) => {
          this.selectedUser$.set({ ...userDetails, type: NodeType.CENTER });
          return of(userDetails);
        })
      )
      .subscribe((res) => {
        const centerNode: GraphNode = {
          id: res.displayName,
          avatarUrl: res.avatar,
          type: NodeType.CENTER,
          followersCount: res.followers,
          followingCount: res.following,
          data: res,
        };

        const followerNode: GraphNode = {
          id: `${crypto.randomUUID()}`,
          type: NodeType.FOLLOWER,
          followersCount: res.followers,
        };

        const followingNode: GraphNode = {
          id: `${crypto.randomUUID()}`,
          type: NodeType.FOLLOWING,
          followingCount: res.following,
        };

        const nodes = [centerNode, followerNode, followingNode];
        const links: GraphLink[] = [
          {
            source: followerNode.id,
            target: centerNode.id,
            relationship: LinkType.FOLLOWER,
          },
          {
            source: centerNode.id,
            target: followingNode.id,
            relationship: LinkType.FOLLOWING,
          },
        ];

        this.graphData$.set({ nodes, links });
      });
  }

  handleConnections() {
    const user = this.selectedUser$();
    if (!user) return;

    forkJoin({
      followers: this.githubSvc.getFollowers(user.displayName),
      following: this.githubSvc.getFollowing(user.displayName),
    }).subscribe(({ followers, following }) => {
      const centerNode: GraphNode = {
        id: user.displayName,
        avatarUrl: user.avatar,
        type: NodeType.CENTER,
        followersCount: user.followers,
        followingCount: user.following,
        data: user,
      };

      // Create maps for quick lookup
      const followerMap = new Map(followers.map((f) => [f.displayName, f]));
      const followingMap = new Map(following.map((f) => [f.displayName, f]));

      // Collect all unique user IDs
      const allIds = new Set([
        ...followers.map((f) => f.displayName),
        ...following.map((f) => f.displayName),
      ]);

      const nodes: GraphNode[] = [centerNode];

      allIds.forEach((id) => {
        const followerData = followerMap.get(id);
        const followingData = followingMap.get(id);
        const userData = followerData || followingData;

        const nodeType: NodeType =
          followerData && followingData
            ? NodeType.MUTUAL
            : followerData
            ? NodeType.FOLLOWER
            : NodeType.FOLLOWING;

        nodes.push({
          id: id,
          type: nodeType,
          avatarUrl: userData?.avatar,
          data: userData,
        });
      });

      const links: GraphLink[] = [];

      // Add links
      followers.forEach((f) => {
        links.push({
          source: f.displayName,
          target: user.displayName,
          relationship: LinkType.FOLLOWER,
        });
      });

      following.forEach((f) => {
        const existing = links.find(
          (l) => l.source === f.displayName && l.target === user.displayName
        );
        if (existing) {
          existing.relationship = LinkType.MUTUAL;
        } else {
          links.push({
            source: user.displayName,
            target: f.displayName,
            relationship: LinkType.FOLLOWING,
          });
        }
      });

      this.graphData$.set({ nodes, links });
    });
  }
}
