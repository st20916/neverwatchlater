import { Router } from 'express';

import authRoute from './auth.route.js';
import healthRoute from './health.route.js';
import playlistRoute from './playlist.route.js';

const router = Router();

router.use('/health', healthRoute);
router.use('/auth', authRoute);
router.use('/playlists', playlistRoute);

export default router;
