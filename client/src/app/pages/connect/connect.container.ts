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

  loadGraphForUser(user: GitHubSearchUser) {
    this.loading$.set(true);
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
          console.log('this.selectedUser$()', this.selectedUser$());
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

  handleConnections() {
    const user = this.selectedUser$();
    if (!user) return;
    this.loading$.set(true);

    const observables: {
      [key: string]: Observable<{
        users: GitHubSearchUser[];
        hasMore: boolean;
      }>;
    } = {};

    if (!this.followersDone$()) {
      observables['followers'] = this.githubSvc.getFollowers(
        user.displayName,
        this.followersPage$()
      );
    }

    if (!this.followingDone$()) {
      observables['following'] = this.githubSvc.getFollowing(
        user.displayName,
        this.followingPage$()
      );
    }

    if (Object.keys(observables).length === 0) {
      this.loading$.set(false);
      return; // nothing to fetch
    }

    // forkJoin({
    //   followers: this.githubSvc.getFollowers(user.displayName, this.followersPage$()),
    //   following: this.githubSvc.getFollowing(user.displayName, this.followingPage$()),
    // }).subscribe({
    forkJoin(observables).subscribe({
      next: ({ followers, following }) => {
        const centerNode: GraphNode = {
          id: user.displayName,
          avatarUrl: user.avatar,
          type: NodeType.CENTER,
          followersCount: user.followers,
          followingCount: user.following,
          data: user,
        };

        if (followers) {
          if (!followers?.hasMore) this.followersDone$.set(true);
          else this.followersPage$.update((p) => p + 1);
        }

        // Determine if we're done with following
        if (following) {
          console.log('following', following);
          if (!following?.hasMore) this.followingDone$.set(true);
          else this.followingPage$.update((p) => p + 1);
        }

        // Create maps for quick lookup
        const followerMap = new Map(
          followers.users?.map((f) => [f.displayName, f])
        );
        const followingMap = new Map(
          following.users?.map((f) => [f.displayName, f])
        );

        // Collect all unique user IDs
        const allIds = new Set([
          ...followers.users?.map((f) => f.displayName),
          ...following.users?.map((f) => f.displayName),
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
        followers?.users.forEach((f) => {
          links.push({
            source: f.displayName,
            target: user.displayName,
            relationship: LinkType.FOLLOWER,
          });
        });

        following?.users.forEach((f) => {
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
      complete: () => this.loading$.set(false),
    });
  }
}
