import { clearSessionCookie } from '../config/session.js';

export const requireAuth = (req, res, next) => {
  if (!req.session?.user) {
    // 세션 만료·서버 재시작 등으로 로그인 상태가 깨진 경우, 브라우저에 남은 sid도 제거한다.
    clearSessionCookie(res);
    return res.status(401).json({ message: '로그인이 필요합니다.' });
  }
  next();
};
