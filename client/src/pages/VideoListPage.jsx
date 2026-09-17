import { useState } from 'react';

import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Toast from '../components/Toast.jsx';
import VideoCard from '../components/VideoCard.jsx';
import VideoListPagination from '../components/VideoListPagination.jsx';
import { MOCK_VIDEOS } from '../data/mockVideos.js';
import { getDdayState, getElapsedDays } from '../utils/dday.js';

import './VideoListPage.css';

export const PAGE_SIZE = 5;

const SYNC_STATUS = {
  synced: {
    label: '동기화 완료',
    detail: '전용 재생목록이 최신 상태입니다.',
  },
  syncing: {
    label: '동기화 중',
    detail: '전용 재생목록을 확인하고 있습니다.',
  },
  failed: {
    label: '동기화 실패',
    detail: '유튜브와 통신하지 못해 동기화가 중단되었습니다.',
  },
};

const ACTION_DELAY_MS = 500;

const sortByNeglected = (videos) =>
  [...videos].sort(
    (a, b) => getElapsedDays(b.savedAt) - getElapsedDays(a.savedAt),
  );

const VideoListPage = ({ initialSyncState = 'synced' }) => {
  const [syncState, setSyncState] = useState(initialSyncState);
  const [videos, setVideos] = useState(() => sortByNeglected(MOCK_VIDEOS));
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [cleanedCount, setCleanedCount] = useState(0);
  const [toast, setToast] = useState(null);

  const totalPages = Math.max(1, Math.ceil(videos.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageVideos = videos.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const remainingCount = videos.length;
  const targetCount = videos.filter(
    (video) => getDdayState(video)?.isNeglected,
  ).length;
  const syncStatus = SYNC_STATUS[syncState] ?? SYNC_STATUS.synced;

  const runAction = (video, action, onSuccess) => {
    setPending({ id: video.id, action });

    setTimeout(() => {
      setPending(null);
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

  const handleRetrySync = () => {
    if (syncState !== 'failed') {
      return;
    }

    setSyncState('syncing');

    setTimeout(() => {
      setSyncState('synced');
    }, ACTION_DELAY_MS);
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
    <section className="nwl-page video-list-page">
      <div className="nwl-grain" aria-hidden="true" />

      <div className="video-list-page__inner">
        <header className="video-list-page__header">
          <p className="video-list-page__kicker">ARCHIVE / PLAYLIST</p>
          <div className="video-list-page__heading">
            <h1>정리 목록</h1>
            <div className="video-list-page__counts">
              <span className="video-list-page__count video-list-page__count--remaining">
                남은 영상 {remainingCount}개
              </span>
              <span className="video-list-page__count video-list-page__count--target">
                청소 대상 {targetCount}개
              </span>
              <span className="video-list-page__count">
                청소 완료 {cleanedCount}개
              </span>
            </div>
          </div>
          <p className="video-list-page__description">
            저장한 영상이 도착했어요. 오래 방치된 영상일수록 위에 먼저 보여요.
          </p>
        </header>

        <div
          className={`video-list-page__sync video-list-page__sync--${syncState}`}
          role="status"
        >
          <div className="video-list-page__sync-copy">
            <p className="video-list-page__sync-label">
              <span className="video-list-page__sync-dot" aria-hidden="true" />
              {syncStatus.label}
            </p>
            <p className="video-list-page__sync-detail">{syncStatus.detail}</p>
          </div>
          {syncState === 'failed' ? (
            <button
              type="button"
              className="video-list-page__retry"
              onClick={handleRetrySync}
            >
              동기화 재시도
            </button>
          ) : null}
        </div>

        {videos.length === 0 ? (
          <div className="video-list-page__empty">
            <p className="video-list-page__empty-title">정리할 영상이 없습니다</p>
            <p className="video-list-page__empty-description">
              유튜브에서 ‘Neverwatchlater’ 재생목록에 영상을 저장하면 다음
              동기화에 카드로 표시됩니다.
            </p>
          </div>
        ) : (
          <>
            <ul className="video-list-page__items">
              {pageVideos.map((video) => (
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

            <VideoListPagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
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
