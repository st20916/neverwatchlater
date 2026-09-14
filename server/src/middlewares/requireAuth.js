/**
 * 로그인 세션이 없으면 401을 반환하는 공통 미들웨어.
 * 로그인 사용자가 필요한 라우트(예: /api/playlists/*)에서 재사용한다.
 */
export const requireAuth = (req, res, next) => {
  if (!req.session?.user) {
    return res.status(401).json({ message: '로그인이 필요합니다.' });
  }
  next();
};
