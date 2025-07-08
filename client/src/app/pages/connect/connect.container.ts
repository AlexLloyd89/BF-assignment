import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
  tap,
  finalize,
  Observable,
  firstValueFrom,
} from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GithubService } from '../../services/github.service';
import { FormControl } from '@angular/forms';
import {
  GitHubCacheEntry,
  GitHubDetailUser,
  GitHubSearchUser,
  GraphLink,
  GraphNode,
  LinkType,
  NodeType,
} from '../../models/app.model';
import { CacheDbService } from '../../services/cache-db.service';

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
    [loading$]="loading$()"
    [searchLoading$]="searchLoading$()"
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
  private cacheDbSvc = inject(CacheDbService);
  private githubSvc = inject(GithubService);
  private snackBar = inject(MatSnackBar);
  formControl = new FormControl<string>('', { nonNullable: true });
  options$ = signal<GitHubSearchUser[]>([]);
  graphData$ = signal<{ nodes: GraphNode[]; links: GraphLink[] }>({
    nodes: [],
    links: [],
  });
  selectedUser$ = signal<(GitHubDetailUser & { type: NodeType }) | null>(null);
  loading$ = signal<boolean>(false);
  searchLoading$ = signal<boolean>(false);
  followersPage$ = signal(1);
  followingPage$ = signal(1);
  followersDone$ = signal<boolean>(false);
  followingDone$ = signal<boolean>(false);
  followersAccumulated: GitHubSearchUser[] = [];
  followingAccumulated: GitHubSearchUser[] = [];

  constructor() {
    this.formControl.valueChanges
      .pipe(
        tap(() => this.searchLoading$.set(true)),
        takeUntilDestroyed(),
        debounceTime(350),
        switchMap((value) =>
          this.githubSvc.searchUsers(value).pipe(
            catchError((err) => {
              this.snackBar.open(
                'Failed to fetch users from GitHub. Please try again later.',
                'Close',
                {
                  duration: 3000,
                  horizontalPosition: 'right',
                }
              );
              console.error('GitHub search failed', err);
              return of([]);
            }),
            finalize(() => this.searchLoading$.set(false))
          )
        )
      )
      .subscribe({
        next: (users) => this.options$.set(users),
        error: (err) => {
          console.error('Unhandled error in valueChanges stream:', err);
          this.searchLoading$.set(false);
        },
      });
  }

  handleGitHubNav(url: string) {
    window.open(url, '_blank');
  }

  async loadGraphForUser(user: GitHubSearchUser) {
    this.loading$.set(true);

    const cached = await this.cacheDbSvc.getCachedUserData(user.displayName);

    if (cached) {
      this.selectedUser$.set({ ...cached.user, type: NodeType.CENTER });
      this.graphData$.set({
        nodes: cached.graphData.nodes,
        links: cached.graphData.links,
      });
      this.loading$.set(false);
      return;
    }

    this.githubSvc
      .getUserByUsername(user.displayName)
      .pipe(
        switchMap((userDetails: GitHubDetailUser) => {
          this.selectedUser$.set({ ...userDetails, type: NodeType.CENTER });
          return of(userDetails);
        }),
        finalize(() => this.loading$.set(false))
      )
      .subscribe({
        next: (res) => {
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
        },
        error: (err) => {
          this.snackBar.open(
            'Failed to fetch users from GitHub. Please try again later.',
            'Close',
            {
              duration: 3000,
              horizontalPosition: 'right',
            }
          );
          console.error('Error loading GitHub data:', err);
        },
      });
  }

  async handleConnections() {
    const user = this.selectedUser$();
    if (!user) return;
    this.loading$.set(true);

    try {
      const cached = await this.cacheDbSvc.getCachedUserData(user.displayName);

      const existingFollowers = cached?.followers ?? [];
      const existingFollowing = cached?.following ?? [];

      const startFollowerPage = Math.floor(existingFollowers.length / 100) + 1;
      const startFollowingPage = Math.floor(existingFollowing.length / 100) + 1;

      const [newFollowers, newFollowing] = await Promise.all([
        this.githubSvc.fetchUsersInBatches(
          'followers',
          user.displayName,
          startFollowerPage
        ),
        this.githubSvc.fetchUsersInBatches(
          'following',
          user.displayName,
          startFollowingPage
        ),
      ]);

      const allFollowers = [...existingFollowers, ...newFollowers];
      const allFollowing = [...existingFollowing, ...newFollowing];

      // Build graph
      const centerNode: GraphNode = {
        id: user.displayName,
        avatarUrl: user.avatar,
        type: NodeType.CENTER,
        followersCount: user.followers,
        followingCount: user.following,
        data: user,
      };

      const followerMap = new Map(allFollowers.map((f) => [f.displayName, f]));
      const followingMap = new Map(allFollowing.map((f) => [f.displayName, f]));

      const allIds = new Set([
        ...allFollowers.map((f) => f.displayName),
        ...allFollowing.map((f) => f.displayName),
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
          id,
          type: nodeType,
          avatarUrl: userData?.avatar,
          data: userData,
        });
      });

      const links: GraphLink[] = [];

      allFollowers.forEach((f) => {
        links.push({
          source: f.displayName,
          target: user.displayName,
          relationship: LinkType.FOLLOWER,
        });
      });

      allFollowing.forEach((f) => {
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

      // Cache updated state
      const cacheEntry: GitHubCacheEntry = {
        id: user.displayName,
        user,
        followers: allFollowers,
        following: allFollowing,
        graphData: { nodes, links },
        updatedAt: Date.now(),
      };

      await this.cacheDbSvc.cacheUserData(cacheEntry);

      // Update UI
      this.graphData$.set({ nodes, links });
    } catch (err) {
      this.snackBar.open(
        'Failed to fetch users from GitHub. Please try again later.',
        'Close',
        { duration: 3000, horizontalPosition: 'right' }
      );
      console.error('Error loading GitHub data:', err);
    } finally {
      this.loading$.set(false);
    }
  }
}
