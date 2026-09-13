import { useState } from 'react';
import { Link } from 'react-router-dom';

import StatePreview from '../components/StatePreview.jsx';
import Toast from '../components/Toast.jsx';

import './PlaylistSetupPage.css';

const SETUP_STATES = [
  { value: 'progress', label: '설정 진행 중' },
  { value: 'success', label: '설정 성공' },
  { value: 'failed', label: '설정 실패' },
];

const STEPS = [
  { id: 'account', label: 'Google 계정 연결' },
  { id: 'playlist', label: '‘Neverwatchlater’ 전용 재생목록 생성' },
  { id: 'target', label: '동기화 대상 지정' },
];

const STEP_STATUS = {
  progress: { account: 'done', playlist: 'current', target: 'waiting' },
  success: { account: 'done', playlist: 'done', target: 'done' },
  failed: { account: 'done', playlist: 'failed', target: 'waiting' },
};

const STATUS_LABEL = {
  done: '완료',
  current: '진행 중',
  waiting: '대기',
  failed: '실패',
};

const PlaylistSetupPage = () => {
  const [setupState, setSetupState] = useState('progress');
  const [toast, setToast] = useState(null);

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

    setToast(null);
  };

  const stepStatus = STEP_STATUS[setupState];

  return (
    <section className="tile tile--light playlist-setup">
      <div className="tile__inner tile__inner--reading">
        <StatePreview
          options={SETUP_STATES}
          value={setupState}
          onChange={changeState}
        />

        <h1 className="type-display-md playlist-setup__title">
          전용 재생목록을 설정하고 있습니다
        </h1>
        <p className="type-body playlist-setup__description">
          유튜브 계정에 ‘Neverwatchlater’ 재생목록을 만들고 동기화 대상으로
          지정합니다. 기본 ‘나중에 볼 동영상’ 재생목록은 사용하지 않습니다.
        </p>

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
              재생목록 생성 또는 지정에 실패했습니다. 다시 시도해 주세요.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => changeState('progress')}
            >
              재생목록 설정 재시도
            </button>
          </div>
        ) : null}

        {setupState === 'success' ? (
          <div className="playlist-setup__result">
            <p className="type-body playlist-setup__success">
              ‘Neverwatchlater’ 재생목록이 동기화 대상으로 지정되었습니다.
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
