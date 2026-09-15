import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchCurrentUser } from '../api/authApi';
import { setupDedicatedPlaylist } from '../api/playlistApi';
import Toast from '../components/Toast.jsx';

import './PlaylistSetupPage.css';

const STEPS = [
  { id: 'account', label: 'Google 계정 연결' },
  { id: 'playlist', label: '‘Neverwatchlater’ 전용 재생목록 생성' },
  { id: 'target', label: '동기화 대상 지정' },
];

const STATUS_LABEL = {
  done: '완료',
  current: '진행 중',
  waiting: '대기',
  failed: '실패',
};

/**
 * Google 로그인 성공 후(server/src/controllers/auth.controller.js의
 * handleGoogleCallback이 `/playlist-setup`으로 리다이렉트) 진입하는 실제 연동 화면.
 * 1) 세션에서 로그인된 계정 정보를 확인하고, 2) 전용 재생목록(Neverwatchlater)을
 * 확보한다(POST /api/playlists/setup).
 */
const PlaylistSetupPage = () => {
  // 'progress' | 'success' | 'failed'
  const [setupState, setSetupState] = useState('progress');
  // 실패가 발생한 단계. 재시도 시 어디서부터 다시 시작할지 판단하는 데 사용한다.
  const [failedStep, setFailedStep] = useState(null); // 'account' | 'playlist' | null
  const [user, setUser] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [toast, setToast] = useState(null);

  const runPlaylistSetup = useCallback(() => {
    setSetupState('progress');
    setFailedStep(null);
    setErrorMessage(null);

    setupDedicatedPlaylist()
      .then((result) => {
        setPlaylist(result);
        setSetupState('success');
        setToast({ tone: 'success', message: '전용 재생목록 설정을 완료했습니다.' });
      })
      .catch((err) => {
        setErrorMessage(err.message);
        setFailedStep('playlist');
        setSetupState('failed');
        setToast({
          tone: 'error',
          message: '재생목록을 만들지 못했습니다. 다시 시도해 주세요.',
        });
      });
  }, []);

  const checkAccountThenSetup = useCallback(() => {
    setSetupState('progress');
    setFailedStep(null);
    setErrorMessage(null);

    fetchCurrentUser()
      .then(({ user: currentUser }) => {
        setUser(currentUser);
        runPlaylistSetup();
      })
      .catch((err) => {
        setErrorMessage(err.message);
        setFailedStep('account');
        setSetupState('failed');
      });
  }, [runPlaylistSetup]);

  useEffect(() => {
    checkAccountThenSetup();
    // 최초 진입 시 한 번만 실행한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retry = () => {
    if (failedStep === 'account') {
      checkAccountThenSetup();
      return;
    }
    runPlaylistSetup();
  };

  const stepStatus = {
    account: user ? 'done' : failedStep === 'account' ? 'failed' : 'current',
    playlist:
      setupState === 'success'
        ? 'done'
        : !user
          ? 'waiting'
          : failedStep === 'playlist'
            ? 'failed'
            : 'current',
    target: setupState === 'success' ? 'done' : 'waiting',
  };

  return (
    <section className="tile tile--light playlist-setup">
      <div className="tile__inner tile__inner--reading">
        <h1 className="type-display-md playlist-setup__title">
          전용 재생목록을 설정하고 있습니다
        </h1>
        <p className="type-body playlist-setup__description">
          유튜브 계정에 ‘Neverwatchlater’ 재생목록을 만들고 동기화 대상으로
          지정합니다. 기본 ‘나중에 볼 동영상’ 재생목록은 사용하지 않습니다.
        </p>

        {user ? (
          <p className="type-caption playlist-setup__inline">
            연결된 계정: {user.email}
          </p>
        ) : null}

        <ol className="playlist-setup__steps">
          {STEPS.map((step) => (
            <li key={step.id} className="playlist-setup__step utility-card">
              <span className="type-body-strong playlist-setup__step-label">
                {step.label}
              </span>
              <span
                className={
                  stepStatus[step.id] === 'failed'
                    ? 'badge badge--warning'
                    : 'badge badge--neutral'
                }
              >
                {STATUS_LABEL[stepStatus[step.id]]}
              </span>
            </li>
          ))}
        </ol>

        {setupState === 'progress' ? (
          <p className="type-caption playlist-setup__inline" role="status">
            재생목록을 만드는 중입니다… 잠시만 기다려 주세요.
          </p>
        ) : null}

        {setupState === 'failed' ? (
          <div className="playlist-setup__result">
            <p className="type-body playlist-setup__error">
              {errorMessage ||
                '재생목록 생성 또는 지정에 실패했습니다. 다시 시도해 주세요.'}
            </p>
            <button type="button" className="btn-primary" onClick={retry}>
              재생목록 설정 재시도
            </button>
          </div>
        ) : null}

        {setupState === 'success' ? (
          <div className="playlist-setup__result">
            <p className="type-body playlist-setup__success">
              ‘Neverwatchlater’ 재생목록이 동기화 대상으로 지정되었습니다.
              {playlist?.created ? ' (새로 생성됨)' : ' (기존 재생목록 사용)'}
            </p>
            <Link to="/videos" className="btn-primary">
              정리 목록으로 이동
            </Link>
          </div>
        ) : null}
      </div>

      {toast ? (
        <Toast
          message={toast.message}
          tone={toast.tone}
          onClose={() => setToast(null)}
        />
      ) : null}
    </section>
  );
};

export default PlaylistSetupPage;
