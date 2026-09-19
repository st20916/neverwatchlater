import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { fetchCurrentUser, getGoogleLoginUrl } from '../api/authApi';
import { setupDedicatedPlaylist } from '../api/playlistApi';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Toast from '../components/Toast.jsx';
import { getAuthFailureCopy } from '../data/authFailureReasons.js';

import './PlaylistSetupPage.css';

const SETUP_STATES = [
  { value: 'linking', label: '연동 진행 중' },
  { value: 'progress', label: '설정 진행 중' },
  { value: 'success', label: '설정 성공' },
  { value: 'failed', label: '설정 실패' },
  { value: 'accountFailed', label: '계정 연결 실패' },
];

const STEPS = [
  { id: 'account', label: 'Google 계정 연결', rail: '계정 연결' },
  { id: 'playlist', label: '‘Neverwatchlater’ 전용 재생목록 생성', rail: '재생목록 생성' },
  { id: 'target', label: '동기화 대상 지정', rail: '동기화 지정' },
  { id: 'complete', label: '설정 완료', rail: '설정 완료' },
];

const STEP_STATUS = {
  linking: {
    account: 'current',
    playlist: 'waiting',
    target: 'waiting',
    complete: 'waiting',
  },
  progress: {
    account: 'done',
    playlist: 'current',
    target: 'waiting',
    complete: 'waiting',
  },
  success: {
    account: 'done',
    playlist: 'done',
    target: 'done',
    complete: 'done',
  },
  failed: {
    account: 'done',
    playlist: 'failed',
    target: 'waiting',
    complete: 'waiting',
  },
  accountFailed: {
    account: 'failed',
    playlist: 'waiting',
    target: 'waiting',
    complete: 'waiting',
  },
};

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M3.2 8.2 6.6 11.5 12.8 4.6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const AlertIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9.25" />
    <path d="M12 8v5" />
    <circle cx="12" cy="16.25" r="0.85" fill="currentColor" stroke="none" />
  </svg>
);

const RetryIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const ArrowUpRight = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M7 7h10v10" />
    <path d="M7 17 17 7" />
  </svg>
);

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
  const navigate = useNavigate();

  // 'progress' | 'success' | 'failed'
  const [setupState, setSetupState] = useState('progress');
  // 실패가 발생한 단계. 재시도 시 어디서부터 다시 시작할지 판단하는 데 사용한다.
  // - 'insufficient_scope': 로그인은 되어 있지만 유튜브 권한 동의가 없는 경우
  //   (server가 reason: 'insufficient_scope'로 응답, docs/product-specs/auth.md 1절
  //   마이그레이션 안내 참고) — 재시도로는 해결되지 않고 재로그인(재동의)이 필요하다.
  // - 'no_channel': 로그인 계정에 YouTube 채널이 없는 경우(server가
  //   reason: 'no_channel'로 응답, docs/troubleshooting.md 3절 참고) — 채널을 먼저
  //   만들어야 하며, 채널 생성은 API로 대신할 수 없어 YouTube 채널 생성 화면으로
  //   안내한다.
  const [failedStep, setFailedStep] = useState(null); // 'account' | 'playlist' | 'insufficient_scope' | 'no_channel' | null
  const [user, setUser] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [toast, setToast] = useState(null);
  // 'no_channel' 확인 다이얼로그를 한 번 확인/취소하고 나면, 같은 실패 상태에서
  // 다이얼로그를 다시 띄우지 않고 대신 재시도 버튼을 보여준다.
  const [channelPromptDismissed, setChannelPromptDismissed] = useState(false);
  
const SETUP_HEADER = {
  kicker: 'SETUP / PLAYLIST',
  title: '전용 재생목록을 설정하고 있습니다',
};

const SETUP_SUCCESS_HEADER = {
  kicker: 'SETUP / PLAYLIST',
  title: '전용 재생목록 설정을 완료했습니다.',
};

const SETUP_FAILED_HEADER = {
  kicker: 'SETUP / PLAYLIST',
  title: '재생목록을 만들지 못했습니다.',
};

const ACCOUNT_LINKING_HEADER = {
  kicker: 'SETUP / ACCOUNT',
  title: 'Google 계정을 연동하고 있습니다',
};

const ACCOUNT_FAILED_HEADER = {
  kicker: 'SETUP / ACCOUNT',
  title: 'Google 계정 연결에 실패했습니다',
  description: '권한을 확인하고 다시 로그인해 주세요.',
};

const PlaylistSetupPage = ({
  initialState = 'progress',
  failureReason = '',
  showPreview = true,
  children = null,
} = {}) => {
  const [setupState, setSetupState] = useState(initialState);
  const [toast, setToast] = useState(null);
  const authFailureCopy = getAuthFailureCopy(failureReason);

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

        if (err.reason === 'insufficient_scope') {
          // 유튜브 권한 동의가 없는 세션 — 재시도가 아니라 재로그인이 필요하다.
          setFailedStep('insufficient_scope');
          setSetupState('failed');
          setToast({ tone: 'error', message: err.message });
          return;
        }

        if (err.reason === 'no_channel') {
          // YouTube 채널이 없는 계정 — 채널 생성 화면으로 안내해야 한다.
          setChannelPromptDismissed(false);
          setFailedStep('no_channel');
          setSetupState('failed');
          setToast({ tone: 'error', message: err.message });
          return;
        }

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

    if (nextState === 'accountFailed') {
      setToast({
        tone: 'error',
        message: 'Google 계정을 연결하지 못했습니다. 다시 로그인해 주세요.',
      });
      return;
    }

    setToast(null);
  };

  const stepStatus = STEP_STATUS[setupState];
  const isLinking = setupState === 'linking';
  const isAccountFailed = setupState === 'accountFailed';
  const headerCopy = {
    linking: ACCOUNT_LINKING_HEADER,
    success: SETUP_SUCCESS_HEADER,
    failed: SETUP_FAILED_HEADER,
    accountFailed: ACCOUNT_FAILED_HEADER,
  }[setupState] ?? SETUP_HEADER;

  return (
    <section className="nwl-page playlist-setup">
      <div className="nwl-grain" aria-hidden="true" />

      <div className="playlist-setup__inner">
        <header className="playlist-setup__header">
          <p className="playlist-setup__kicker">{headerCopy.kicker}</p>
          <div className="playlist-setup__heading">
            <h1>{headerCopy.title}</h1>
          </div>
          <p className="playlist-setup__description">
            {isAccountFailed ? (
              headerCopy.description
            ) : isLinking ? (
              <>
                유튜브 재생목록을 읽을 수 있도록 Google 계정 권한을 확인하는
                중입니다.{' '}
                <br className="playlist-setup__break" />
                창을 닫지 말고 잠시만 기다려 주세요.
              </>
            ) : setupState === 'failed' ? (
              <>
                전용 재생목록을 만들거나 동기화 대상으로 지정하는 데 문제가
                생겼습니다.{' '}
                <br className="playlist-setup__break" />
                아래 재시도로 설정을 다시 진행해 주세요.
              </>
            ) : (
              <>
                유튜브 계정에 ‘Neverwatchlater’ 재생목록을 만들고 동기화 대상으로
                지정합니다.{' '}
                <br className="playlist-setup__break" />
                기본 ‘나중에 볼 동영상’ 재생목록은 사용하지 않습니다.
              </>
            )}
          </p>
        </header>

        <ol className="playlist-setup__rail" aria-label="설정 진행 단계">
          {STEPS.map((step, index) => {
            const status = stepStatus[step.id];
            const indexLabel = String(index + 1).padStart(2, '0');

            return (
              <li
                key={`rail-${step.id}`}
                className={`playlist-setup__rail-step playlist-setup__rail-step--${status}`}
                aria-current={status === 'current' ? 'step' : undefined}
              >
                <span className="playlist-setup__rail-node" aria-hidden="true">
                  <span className="playlist-setup__rail-spin" />
                  {status === 'done' ? <CheckIcon /> : indexLabel}
                </span>
                <span className="playlist-setup__rail-label">{step.rail}</span>
              </li>
            );
          })}
        </ol>

        <ol className="playlist-setup__steps">
          {STEPS.filter((step) => step.id !== 'complete').map((step, index) => {
            const status = stepStatus[step.id];

            return (
              <li
                key={step.id}
                className={`playlist-setup__step playlist-setup__step--${status}`}
              >
                <span className="playlist-setup__index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="playlist-setup__step-label">{step.label}</span>
                <span className={`playlist-setup__badge playlist-setup__badge--${status}`}>
                  <span className="playlist-setup__dot" aria-hidden="true" />
                  {STATUS_LABEL[status]}
                </span>
              </li>
            );
          })}
        </ol>

        {isLinking ? (
          <div className="playlist-setup__banner playlist-setup__banner--linking" role="status">
            <span className="playlist-setup__spinner" aria-hidden="true" />
            <div className="playlist-setup__banner-copy">
              <p className="playlist-setup__banner-title">
                Google 계정 정보를 확인하고 있습니다
              </p>
              <p className="playlist-setup__banner-detail">
                권한 승인이 끝나면 자동으로 다음 단계로 넘어갑니다.
              </p>
            </div>
          </div>
        ) : null}

        {setupState === 'progress' ? (
          <div className="playlist-setup__banner playlist-setup__banner--progress" role="status">
            <span className="playlist-setup__spinner" aria-hidden="true" />
            <div className="playlist-setup__banner-copy">
              <p className="playlist-setup__banner-title">
                재생목록을 만드는 중입니다
              </p>
              <p className="playlist-setup__banner-detail">
                잠시만 기다려 주세요.
              </p>
            </div>
          </div>
        ) : null}

        {setupState === 'failed' ? (
          <div className="playlist-setup__result playlist-setup__result--failed" role="alert">
            <p className="playlist-setup__result-title">
              <span className="playlist-setup__result-mark" aria-hidden="true">
                <AlertIcon />
              </span>
              재생목록 생성 또는 지정에 실패했습니다.
            </p>
            <button
              type="button"
              className="playlist-setup__action"
              onClick={() => changeState('progress')}
            >
              <RetryIcon />
              재생목록 설정 재시도
            </button>
          </div>
        ) : null}

        {setupState === 'accountFailed' ? (
          <div className="playlist-setup__result playlist-setup__result--failed" role="alert">
            <div className="playlist-setup__result-copy">
              <p className="playlist-setup__result-title">
                <span className="playlist-setup__result-mark" aria-hidden="true">
                  <AlertIcon />
                </span>
                {authFailureCopy.title}
              </p>
              <p className="playlist-setup__result-detail">{authFailureCopy.detail}</p>
            </div>
            <Link to="/auth/loading" className="playlist-setup__action">
              <RetryIcon />
              다시 로그인 시도
            </Link>
          </div>
        ) : null}

        {setupState === 'success' ? (
          <div className="playlist-setup__result playlist-setup__result--success">
            <p className="playlist-setup__result-title">
              <span className="playlist-setup__result-mark" aria-hidden="true">
                <CheckIcon />
              </span>
              ‘Neverwatchlater’ 재생목록이 동기화 대상으로 지정되었습니다.
            </p>
            <Link to="/videos" className="playlist-setup__action">
              정리 목록으로 이동
              <ArrowUpRight />
            </Link>
          </div>
        ) : null}

        {children}

        {showPreview ? (
          <StatePreview
            options={SETUP_STATES}
            value={setupState}
            onChange={changeState}
          />
        ) : null}
      </div>

      {toast ? (
        <Toast
          message={toast.message}
          tone={toast.tone}
          onClose={() => setToast(null)}
        />
      ) : null}

      {showLoginConfirm ? (
        <ConfirmDialog
          title="로그인 필요"
          description="로그인이 필요합니다. 로그인 하시겠습니까?"
          confirmLabel="예"
          cancelLabel="아니오"
          onConfirm={handleConfirmLogin}
          onCancel={handleCancelLogin}
        />
      ) : null}

      {showChannelConfirm ? (
        <ConfirmDialog
          title="YouTube 채널 필요"
          description="YouTube 채널이 없습니다. 채널을 만드시겠습니까?"
          confirmLabel="예"
          cancelLabel="아니오"
          onConfirm={handleConfirmCreateChannel}
          onCancel={handleCancelCreateChannel}
        />
      ) : null}
    </section>
  );
};

export default PlaylistSetupPage;
