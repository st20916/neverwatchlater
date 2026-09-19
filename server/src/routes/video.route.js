import { Router } from 'express';

import {
  bulkImportVideos,
  deleteVideo,
  listVideos,
  resetVideoDday,
  streamSummaries,
  syncVideosNow,
  updateArchiveState,
} from '../controllers/video.controller.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = Router();

router.get('/', requireAuth, listVideos);
router.post('/sync', requireAuth, syncVideosNow);
router.post('/bulk-import', requireAuth, bulkImportVideos);
router.get('/stream', requireAuth, streamSummaries);
router.delete('/:videoId', requireAuth, deleteVideo);
router.patch('/:videoId/archive', requireAuth, updateArchiveState);
router.patch('/:videoId/reset-dday', requireAuth, resetVideoDday);

export default router;
