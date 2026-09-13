import { useState } from 'react';

import ConfirmDialog from '../components/ConfirmDialog.jsx';
import StatePreview from '../components/StatePreview.jsx';
import StatusNotice from '../components/StatusNotice.jsx';
import Toast from '../components/Toast.jsx';
import VideoCard from '../components/VideoCard.jsx';
import { MOCK_VIDEOS } from '../data/mockVideos.js';
import { getElapsedDays } from '../utils/dday.js';

import './VideoListPage.css';

const SYNC_STATES = [
  { value: 'synced', label: '동기화 완료' },
  { value: 'syncing', label: '동기화 중' },
  { value: 'failed', label: '동기화 실패' },
];

const API_STATES = [
  { value: 'success', label: '정리 요청 성공' },
  { value: 'failure', label: '정리 요청 실패' },
];

const ACTION_DELAY_MS = 500;

const DELETE_ERROR_MESSAGE =
  '유튜브 서버와 통신 중 오류가 발생했습니다. 다시 시도해 주세요.';

const sortByNeglected = (videos) =>
  [...videos].sort(
    (a, b) => getElapsedDays(b.savedAt) - getElapsedDays(a.savedAt),
  );

const VideoListPage = () => {
  const [syncState, setSyncState] = useState('synced');
  const [apiState, setApiState] = useState('success');
  const [videos, setVideos] = useState(() => sortByNeglected(MOCK_VIDEOS));
  const [pending, setPending] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [cleanedCount, setCleanedCount] = useState(0);
  const [toast, setToast] = useState(null);

  const runAction = (video, action, onSuccess) => {
    setPending({ id: video.id, action });

    setTimeout(() => {
      setPending(null);

      if (apiState === 'failure') {
        setToast({ tone: 'error', message: DELETE_ERROR_MESSAGE });
        return;
      }

      onSuccess();
    }, ACTION_DELAY_MS);
  };

  const removeVideo = (video, successMessage) => {
    setRemovingId(video.id);

    setTimeout(() => {
      setVideos((current) => current.filter((item) => item.id !== video.id));
      setRemovingId(null);
      setCleanedCount((count) => count + 1);
      setToast({ tone: 'success', message: successMessage });
    }, 300);
  };

  const handleWatch = (video) => {
    setToast({
      tone: 'success',
      message: '유튜브 영상을 새 탭에서 열었습니다. (프로토타입)',
    });

    runAction(video, 'watch', () =>
      removeVideo(video, '바로 보기로 영상을 정리했습니다.'),
    );
  };

  const handleLater = (video) => {
    runAction(video, 'later', () => {
      setVideos((current) =>
        sortByNeglected(
          current.map((item) =>
            item.id === video.id
              ? { ...item, savedAt: new Date().toISOString() }
              : item,
          ),
        ),
      );
      setToast({ tone: 'success', message: '저장 일자를 초기화했습니다.' });
    });
  };

  const handleArchive = (video) => {
    runAction(video, 'archive', () => {
      setVideos((current) =>
        current.map((item) =>
          item.id === video.id ? { ...item, isArchived: true } : item,
        ),
      );
      setToast({ tone: 'success', message: '영상을 보관했습니다.' });
    });
  };

  const handleDeleteConfirmed = () => {
    const video = confirmTarget;
    setConfirmTarget(null);

    runAction(video, 'delete', () =>
      removeVideo(video, '안볼래요로 영상을 삭제했습니다.'),
    );
  };

  return (
    <section className="tile tile--parchment video-list">
      <div className="tile__inner">
        <header className="video-list__header">
          <div>
            <h1 className="type-display-md">정리 목록</h1>
            <p className="type-body video-list__description">
              전용 재생목록에서 동기화된 영상입니다. 오래 방치된 영상이 위에
              표시됩니다.
            </p>
          </div>
          <div className="video-list__meta">
            <span className="badge badge--outline">
              청소 완료 {cleanedCount}개
            </span>
          </div>
        </header>

        <div className="video-list__previews">
          <StatePreview
            label="동기화 상태"
            options={SYNC_STATES}
            value={syncState}
            onChange={setSyncState}
          />
          <StatePreview
            label="정리 액션 응답"
            options={API_STATES}
            value={apiState}
            onChange={setApiState}
          />
        </div>

        {syncState === 'syncing' ? (
          <StatusNotice
            label="동기화 중"
            title="전용 재생목록을 동기화하고 있습니다"
            description="최대 3일 주기로 자동 동기화되며, 완료되면 카드가 갱신됩니다."
          />
        ) : null}

        {syncState === 'failed' ? (
          <StatusNotice
            label="동기화 실패"
            title="유튜브와 통신하지 못해 동기화가 중단되었습니다"
            description="기존 카드는 그대로 유지됩니다. 다음 주기에 다시 시도하거나 지금 재시도할 수 있습니다."
            actionLabel="동기화 재시도"
            onAction={() => setSyncState('syncing')}
          />
        ) : null}

        {videos.length === 0 ? (
          <div className="video-list__empty utility-card">
            <p className="type-body-strong">정리할 영상이 없습니다</p>
            <p className="type-caption video-list__empty-description">
              유튜브에서 ‘Neverwatchlater’ 재생목록에 영상을 저장하면 다음
              동기화에 카드로 표시됩니다.
            </p>
          </div>
        ) : (
          <ul className="video-list__items">
            {videos.map((video) => (
              <li key={video.id}>
                <VideoCard
                  video={video}
                  pendingAction={
                    pending?.id === video.id ? pending.action : null
                  }
                  isRemoving={removingId === video.id}
                  onWatch={handleWatch}
                  onLater={handleLater}
                  onArchive={handleArchive}
                  onDelete={setConfirmTarget}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {confirmTarget ? (
        <ConfirmDialog
          title="이 영상을 삭제할까요?"
          description={`‘${confirmTarget.title}’을(를) 전용 재생목록과 서비스 목록에서 삭제합니다.`}
          confirmLabel="삭제"
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setConfirmTarget(null)}
        />
      ) : null}

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

export default VideoListPage;
