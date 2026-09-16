import { Router } from 'express';

import authRoute from './auth.route.js';
import healthRoute from './health.route.js';
import playlistRoute from './playlist.route.js';
import videoRoute from './video.route.js';

const router = Router();

router.use('/health', healthRoute);
router.use('/auth', authRoute);
router.use('/playlists', playlistRoute);
router.use('/videos', videoRoute);

export default router;
