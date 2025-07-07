import express, { Request, Response } from 'express';
import {
  searchUsers,
  getUserByUsername,
  getFollowers,
  getFollowing,
} from '../services/github.service';

const router = express.Router();

// GET /api/github/users/search?q=query
router.get('/search', async (req: Request, res: Response) => {
  console.log('🔥 Hit /users/search route');
  console.log('Query:', req.query);
  const query = req.query.q as string;
  if (!query) {
    res.status(400).json({ error: 'Query parameter "q" is required' });
    return;
  }
  try {
    const users = await searchUsers(query);
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// GET /api/github/users/:username
router.get('/:username', async (req: Request, res: Response) => {
  const { username } = req.params;

  try {
    const user = await getUserByUsername(username);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// GET /api/github/users/:username/followers
router.get('/:username/followers', async (req: Request, res: Response) => {
  const { username } = req.params;

  try {
    const followers = await getFollowers(username);
    res.json(followers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch followers' });
  }
});

// GET /api/github/users/:username/following
router.get('/:username/following', async (req: Request, res: Response) => {
  const { username } = req.params;

  try {
    const following = await getFollowing(username);
    res.json(following);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch following' });
  }
});

export default router;
