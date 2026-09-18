import { Router } from 'express';

import {
  deleteVideo,
  listVideos,
  streamSummaries,
  syncVideosNow,
} from '../controllers/video.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = Router();

router.get('/', requireAuth, listVideos);
router.post('/sync', requireAuth, syncVideosNow);
router.get('/stream', requireAuth, streamSummaries);
router.delete('/:videoId', requireAuth, deleteVideo);

export default router;
