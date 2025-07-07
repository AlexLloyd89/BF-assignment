import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GITHUB_API = 'https://api.github.com';
const headers = {
  Authorization: `token ${process.env.GITHUB_TOKEN}`,
};

export async function searchUsers(query: string) {
  const res = await axios.get(`${GITHUB_API}/search/users`, {
    headers,
    params: {
      q: query,
      per_page: 10,
    },
  });

  return res.data.items.map((user: any) => ({
    avatar: user.avatar_url,
    followersUrl: user.followers_url,
    followingUrl: user.following_url,
    id: user.id,
    url: user.html_url,
    displayName: user.login,
  }));
}

export async function getUserByUsername(username: string) {
  const res = await axios.get(`${GITHUB_API}/users/${username}`, {
    headers,
  });

  const user = res.data;
  return {
    avatar: user.avatar_url,
    displayName: user.login,
    url: user.html_url,
    followers: user.followers,
    following: user.following,
    name: user.name,
    company: user.company,
    location: user.location,
    bio: user.bio,
    id: user.id,
  };
}

async function getAllPaginated(url: string): Promise<any[]> {
  let results: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await axios.get(url, {
      headers,
      params: { per_page: 100, page },
    });

    const pageData = res.data;
    results = results.concat(pageData);
    hasMore = pageData.length === 100;
    page++;
  }

  return results;
}

export async function getFollowers(username: string) {
  const allFollowers = await getAllPaginated(`${GITHUB_API}/users/${username}/followers`);

  return allFollowers.map((user: any) => ({
    avatar: user.avatar_url,
    followersUrl: user.followers_url,
    followingUrl: user.following_url,
    id: user.id,
    url: user.html_url,
    displayName: user.login,
  }));
}

export async function getFollowing(username: string) {
  const allFollowing = await getAllPaginated(`${GITHUB_API}/users/${username}/following`);

  return allFollowing.map((user: any) => ({
    avatar: user.avatar_url,
    followersUrl: user.followers_url,
    followingUrl: user.following_url,
    id: user.id,
    url: user.html_url,
    displayName: user.login,
  }));
}
