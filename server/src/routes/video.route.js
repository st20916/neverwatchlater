import { Router } from 'express';

import { listVideos, syncVideosNow } from '../controllers/video.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = Router();

router.get('/', requireAuth, listVideos);
router.post('/sync', requireAuth, syncVideosNow);

export default router;
