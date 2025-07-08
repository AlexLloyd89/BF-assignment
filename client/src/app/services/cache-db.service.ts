import { Injectable } from '@angular/core';
import { GitHubCacheEntry } from '../models/app.model';
import Dexie, { Table } from 'dexie';
import { interval,  } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CacheDbService extends Dexie {
  users!: Table<GitHubCacheEntry, string>;

  constructor() {
    super('AppCacheDB');
    this.version(1).stores({
      users: 'id, updatedAt',
    });

    interval(3 * 60 * 1000).subscribe(() => {
      this.clearCache();
    });
  }

  async cacheUserData(entry: GitHubCacheEntry) {
    await this.users.put(entry);
  }

  async getCachedUserData(id: string): Promise<GitHubCacheEntry | undefined> {
    return this.users.get(id);
  }

  async clearCache() {
    await this.users.clear();
  }

}
