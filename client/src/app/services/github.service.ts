import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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

  getFollowers(username: string): Observable<GitHubSearchUser[]> {
    return this.http.get<GitHubSearchUser[]>(
      `${this.apiUrl}/users/${username}/followers`,
      {
        headers: this.getHeaders(),
      }
    );
  }

  getFollowing(username: string): Observable<GitHubSearchUser[]> {
    return this.http.get<GitHubSearchUser[]>(
      `${this.apiUrl}/users/${username}/following`,
      {
        headers: this.getHeaders(),
      }
    );
  }
}
