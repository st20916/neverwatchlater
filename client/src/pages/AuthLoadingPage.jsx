import { Link } from 'react-router-dom';

import './AuthLoadingPage.css';

const AuthLoadingPage = () => (
  <section className="nwl-page auth-loading" aria-labelledby="auth-loading-title">
    <div className="nwl-grain" aria-hidden="true" />

    <div className="auth-loading__stage">
      <div className="auth-loading__mark" aria-hidden="true">
        <span className="auth-loading__orbit auth-loading__orbit--a" />
        <span className="auth-loading__orbit auth-loading__orbit--b" />
        <span className="auth-loading__orbit auth-loading__orbit--c" />
        <span className="auth-loading__orbit auth-loading__orbit--spin" />
        <span className="auth-loading__badge">NWL</span>
      </div>

      <p className="auth-loading__kicker">Google 연결 / 001</p>

      <h1 id="auth-loading-title" className="auth-loading__title">
        <span className="auth-loading__brand">Google</span>
        <em>인증</em>
      </h1>

      <p className="auth-loading__copy">
        Google 계정과 재생목록 권한을 확인하고 있어요.
        <br />
        잠시만 이 창을 열어두세요.
      </p>

      <div className="auth-loading__dots" role="status">
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span className="auth-loading__sr">인증 진행 중… 창을 닫지 말고 잠시 기다려 주세요.</span>
      </div>

      <p className="auth-loading__foot">
        안전한 연결 · YouTube 재생목록만 연결
      </p>

      <div className="auth-loading__actions">
        <Link to="/playlist-setup">인증 성공 화면 보기</Link>
        <Link to="/auth/failed">인증 실패 화면 보기</Link>
      </div>
    </div>
  </section>
);

export default AuthLoadingPage;
