import { Router } from 'express';

import { getMyPlaylistStatus, setupPlaylist } from '../controllers/playlist.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = Router();

router.post('/setup', requireAuth, setupPlaylist);
router.get('/me', requireAuth, getMyPlaylistStatus);

export default router;
