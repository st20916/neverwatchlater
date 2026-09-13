import { Link } from 'react-router-dom';

import './AuthFailedPage.css';

const FAILURE_REASONS = [
  '요청한 유튜브 권한에 동의하지 않았습니다.',
  '인증 도중 네트워크 오류 또는 응답 시간 초과가 발생했습니다.',
];

const AuthFailedPage = () => (
  <section className="tile tile--light auth-failed">
    <div className="tile__inner tile__inner--reading">
      <span className="badge badge--warning">연결 실패</span>
      <h1 className="type-display-md auth-failed__title">
        Google 계정을 연결하지 못했습니다
      </h1>
      <p className="type-body auth-failed__description">
        아래 원인 중 하나로 연결이 중단되었습니다. 같은 계정으로 다시 시도하거나
        다른 Google 계정을 선택할 수 있습니다.
      </p>

      <ul className="auth-failed__reasons">
        {FAILURE_REASONS.map((reason) => (
          <li key={reason} className="type-caption auth-failed__reason">
            {reason}
          </li>
        ))}
      </ul>

      <div className="auth-failed__actions">
        <Link to="/auth/loading" className="btn-primary">
          같은 계정으로 재시도
        </Link>
        <Link to="/auth/loading" className="btn-secondary-pill">
          다른 Google 계정 선택
        </Link>
      </div>

      <p className="type-caption auth-failed__note">
        유튜브 연동 권한에 동의하지 않으면 정리 목록을 사용할 수 없습니다.
      </p>
    </div>
  </section>
);

export default AuthFailedPage;
