import { Link } from 'react-router-dom';

import './AuthLoadingPage.css';

const AuthLoadingPage = () => (
  <section className="tile tile--parchment auth-loading">
    <div className="tile__inner tile__inner--reading tile__inner--centered">
      <div className="auth-loading__spinner" aria-hidden="true" />
      <h1 className="type-display-md">Google 인증을 진행하고 있습니다</h1>
      <p className="type-body auth-loading__description">
        Google 계정 선택과 유튜브 권한 동의를 완료하면 이 화면에서 다음 단계로
        이동합니다.
      </p>
      <p className="type-caption auth-loading__hint" role="status">
        인증 진행 중… 창을 닫지 말고 잠시 기다려 주세요.
      </p>

      <div className="tile__actions auth-loading__actions">
        <Link to="/playlist-setup" className="btn-primary">
          인증 성공 화면 보기
        </Link>
        <Link to="/auth/failed" className="btn-secondary-pill">
          인증 실패 화면 보기
        </Link>
      </div>
    </div>
  </section>
);

export default AuthLoadingPage;
