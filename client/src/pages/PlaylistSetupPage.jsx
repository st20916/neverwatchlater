import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { fetchCurrentUser, getGoogleLoginUrl } from '../api/authApi';
import { setupDedicatedPlaylist } from '../api/playlistApi';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import StatePreview from '../components/StatePreview.jsx';
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
  showPreview = false,
  children = null,
} = {}) => {
  const navigate = useNavigate();
  const shouldRunSetup = !showPreview && initialState === 'progress';
  const [setupState, setSetupState] = useState(initialState);
  const [failedStep, setFailedStep] = useState(null);
  const [user, setUser] = useState(null);
  const [playlist, setPlaylist] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [channelPromptDismissed, setChannelPromptDismissed] = useState(false);
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
        setToast({
          tone: 'success',
          message: '전용 재생목록 설정을 완료했습니다.',
        });
      })
      .catch((err) => {
        setErrorMessage(err.message);

        if (err.reason === 'insufficient_scope') {
          setFailedStep('insufficient_scope');
          setSetupState('accountFailed');
          setToast({ tone: 'error', message: err.message });
          return;
        }

        if (err.reason === 'no_channel') {
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
        setSetupState('accountFailed');
      });
  }, [runPlaylistSetup]);

  useEffect(() => {
    if (!shouldRunSetup) {
      return undefined;
    }

    checkAccountThenSetup();
    return undefined;
  }, [shouldRunSetup, checkAccountThenSetup]);

  const retry = () => {
    if (failedStep === 'account') {
      checkAccountThenSetup();
      return;
    }

    runPlaylistSetup();
  };

  const changeState = (nextState) => {
    setSetupState(nextState);

    if (nextState === 'success') {
      setToast({ tone: 'success', message: '전용 재생목록 설정을 완료했습니다.' });
      return;
    }

    if (nextState === 'failed') {
      setToast({
        tone: 'error',
        message: '재생목록을 만들지 못했습니다. 다시 시도해 주세요.',
      });
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

  const showLoginConfirm =
    shouldRunSetup &&
    setupState === 'accountFailed' &&
    (failedStep === 'account' || failedStep === 'insufficient_scope');
  const showChannelConfirm =
    shouldRunSetup &&
    setupState === 'failed' &&
    failedStep === 'no_channel' &&
    !channelPromptDismissed;

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
                {errorMessage ||
                  '전용 재생목록을 만들거나 동기화 대상으로 지정하는 데 문제가 생겼습니다.'}{' '}
                <br className="playlist-setup__break" />
                아래 재시도로 설정을 다시 진행해 주세요.
              </>
            ) : (
              <>
                유튜브 계정에 ‘Neverwatchlater’ 재생목록을 만들고 동기화 대상으로
                지정합니다.{' '}
                <br className="playlist-setup__break" />
                기본 ‘나중에 볼 동영상’ 재생목록은 사용하지 않습니다.
                {user?.name ? ` 연결된 계정: ${user.name}` : ''}
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
              onClick={() => (shouldRunSetup ? retry() : changeState('progress'))}
            >
              <RetryIcon />
              {failedStep === 'no_channel'
                ? '채널 생성 후 재생목록 설정 재시도'
                : '재생목록 설정 재시도'}
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
              {playlist?.created ? ' (새로 생성됨)' : playlist ? ' (기존 재생목록 사용)' : ''}
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
          onConfirm={() => {
            window.location.href = getGoogleLoginUrl();
          }}
          onCancel={() => navigate('/')}
        />
      ) : null}

      {showChannelConfirm ? (
        <ConfirmDialog
          title="YouTube 채널 필요"
          description="YouTube 채널이 없습니다. 채널을 만드시겠습니까?"
          confirmLabel="예"
          cancelLabel="아니오"
          onConfirm={() => {
            window.open(
              'https://www.youtube.com/create_channel',
              '_blank',
              'noopener,noreferrer',
            );
            setChannelPromptDismissed(true);
          }}
          onCancel={() => navigate('/')}
        />
      ) : null}
    </section>
  );
};

export default PlaylistSetupPage;
