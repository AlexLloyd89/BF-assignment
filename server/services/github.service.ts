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

export async function getFollowers(username: string, page: number = 1) {
  const res = await axios.get(`${GITHUB_API}/users/${username}/followers`, {
    headers,
    params: {
      page,
      per_page: 100,
    },
  });

  return res.data.map((user: any) => ({
    avatar: user.avatar_url,
    followersUrl: user.followers_url,
    followingUrl: user.following_url,
    id: user.id,
    url: user.html_url,
    displayName: user.login,
  }));
}

export async function getFollowing(username: string, page: number = 1) {
  const res = await axios.get(`${GITHUB_API}/users/${username}/following`, {
    headers,
    params: {
      page,
      per_page: 100,
    },
  });

  return res.data.map((user: any) => ({
    avatar: user.avatar_url,
    followersUrl: user.followers_url,
    followingUrl: user.following_url,
    id: user.id,
    url: user.html_url,
    displayName: user.login,
  }));
}
