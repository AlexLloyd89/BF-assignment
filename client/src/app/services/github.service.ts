import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom, map, Observable, take } from 'rxjs';
import { GitHubDetailUser, GitHubSearchUser } from '../models/app.model';
import { environment } from '../../environment';

@Injectable({
  providedIn: 'root',
})
export class GithubService {
  private apiUrl = environment.apiUrl;
  private apiKey = environment.apiKey;

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'x-api-key': this.apiKey,
    });
  }

  constructor(private http: HttpClient) {}

  searchUsers(searchTerm: string): Observable<GitHubSearchUser[]> {
    return this.http.get<GitHubSearchUser[]>(`${this.apiUrl}/users/search`, {
      headers: this.getHeaders(),
      params: { q: searchTerm },
    });
  }

  getUserByUsername(username: string): Observable<GitHubDetailUser> {
    return this.http.get<GitHubDetailUser>(`${this.apiUrl}/users/${username}`, {
      headers: this.getHeaders(),
    });
  }

  getFollowers(
    username: string,
    page: number = 1
  ): Observable<{ users: GitHubSearchUser[]; hasMore: boolean }> {
    return this.http
      .get<GitHubSearchUser[]>(`${this.apiUrl}/users/${username}/followers`, {
        params: { page },
        headers: this.getHeaders(),
      })
      .pipe(
        map((users) => ({
          users,
          hasMore: users.length === 100,
        }))
      );
  }

  getFollowing(
    username: string,
    page: number = 1
  ): Observable<{ users: GitHubSearchUser[]; hasMore: boolean }> {
    return this.http
      .get<GitHubSearchUser[]>(`${this.apiUrl}/users/${username}/following`, {
        params: { page },
        headers: this.getHeaders(),
      })
      .pipe(
        map((users) => ({
          users,
          hasMore: users.length === 100,
        }))
      );
  }

  async fetchUsersInBatches(
    type: 'followers' | 'following',
    username: string,
    startPage: number,
  ): Promise<GitHubSearchUser[]> {
    const allUsers: GitHubSearchUser[] = [];

    for (let i = 0; i < 10; i++) {
      const page = startPage + i;
      const users = await firstValueFrom(
        this.getUsers(type, username, page).pipe(take(1))
      );
      allUsers.push(...users);

      if (users.length < 100) break;
    }

    return allUsers;
  }

  getUsers(
    type: 'followers' | 'following',
    username: string,
    page: number
  ): Observable<GitHubSearchUser[]> {
    return this.http.get<GitHubSearchUser[]>(
      `${this.apiUrl}/users/${username}/${type}`,
      {
        params: { page },
        headers: this.getHeaders(),
      }
    );
  }
}
