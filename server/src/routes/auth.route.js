import { Router } from 'express';

import { getMe, handleGoogleCallback, logout, redirectToGoogle } from '../controllers/auth.controller.js';

const router = Router();

router.get('/google', redirectToGoogle);
router.get('/google/callback', handleGoogleCallback);
router.get('/me', getMe);
router.post('/logout', logout);

export default router;
