import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import {
  GitHubDetailUser,
  GithubRawUserSearchData,
  GithubSearchResponse,
  GitHubSearchUser,
} from '../models/app.model';

@Injectable({
  providedIn: 'root',
})
export class GithubService {
  private apiUrl = 'https://api.github.com';

  constructor(private http: HttpClient) {}

  searchUsers(term: string): Observable<GitHubSearchUser[]> {
    const query = `${this.apiUrl}/search/users?q=${encodeURIComponent(
      term
    )}&per_page=10`;

    return this.http.get<GithubSearchResponse>(query).pipe(
      map(({ items }) =>
        items.map(
          ({
            avatar_url,
            followers_url,
            following_url,
            id,
            html_url,
            login,
          }) => ({
            avatar: avatar_url,
            followersUrl: followers_url,
            followingUrl: following_url,
            id,
            url: html_url,
            displayName: login,
          })
        )
      )
    );
  }

  getUserByUsername(username: string): Observable<GitHubDetailUser> {
    return this.http
      .get<GithubRawUserSearchData>(`${this.apiUrl}/users/${username}`)
      .pipe(
        map((item) => ({
          avatar: item.avatar_url,
          followersUrl: item.followers_url,
          followingUrl: item.following_url,
          id: item.id,
          url: item.html_url,
          displayName: item.login,
          bio: item.bio,
          createdAt: item.created_at,
          name: item.name,
          followers: item.followers,
          following: item.following,
          htmlUrl: item.html_url,
        }))
      );
  }

  getFollowers(username: string): Observable<GitHubSearchUser[]> {
    return this.http
      .get<GithubRawUserSearchData[]>(
        `${this.apiUrl}/users/${username}/followers`
      )
      .pipe(
        map((items) =>
          items.map(
            ({
              avatar_url,
              followers_url,
              following_url,
              id,
              html_url,
              login,
            }) => ({
              avatar: avatar_url,
              followersUrl: followers_url,
              followingUrl: following_url,
              id,
              url: html_url,
              displayName: login,
            })
          )
        )
      );
  }

  getFollowing(username: string): Observable<GitHubSearchUser[]> {
    return this.http
      .get<GithubRawUserSearchData[]>(
        `${this.apiUrl}/users/${username}/following`
      )
      .pipe(
        map((items) =>
          items.map(
            ({
              avatar_url,
              followers_url,
              following_url,
              id,
              html_url,
              login,
            }) => ({
              avatar: avatar_url,
              followersUrl: followers_url,
              followingUrl: following_url,
              id,
              url: html_url,
              displayName: login,
            })
          )
        )
      );
  }
}
