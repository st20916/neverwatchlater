import { useEffect, useRef, useState } from 'react';

import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Toast from '../components/Toast.jsx';
import VideoCard from '../components/VideoCard.jsx';
import VideoListPagination from '../components/VideoListPagination.jsx';
import { MOCK_VIDEOS } from '../data/mockVideos.js';
import useSectionReveal from '../hooks/useSectionReveal.js';
import { getDdayState, getElapsedDays } from '../utils/dday.js';

import './VideoListPage.css';

export const PAGE_SIZE = 6;

const LIST_TABS = [
  { id: 'all', label: '전체' },
  { id: 'target', label: '정리 대상' },
  { id: 'archived', label: '보관' },
];

const SORT_OPTIONS = [
  { value: 'oldest', label: '저장 오래된 순' },
  { value: 'newest', label: '저장 최신 순' },
];

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
const HEADER_HEIGHT_FALLBACK = 60;

const SyncIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 12a9 9 0 1 1-2.6-6.35" />
    <path d="M21 4v6h-6" />
  </svg>
);

const ChevronIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
);

const useStuckTabs = () => {
  const sentinelRef = useRef(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const headerHeight =
      Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          '--nwl-header-height',
        ),
      ) || HEADER_HEIGHT_FALLBACK;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setStuck(!entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: `-${headerHeight}px 0px 0px 0px`,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return { sentinelRef, stuck };
};

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
  const [toast, setToast] = useState(null);
  const [listTab, setListTab] = useState('all');
  const [sortValue, setSortValue] = useState('oldest');
  const [sortOpen, setSortOpen] = useState(false);
  const { sentinelRef, stuck } = useStuckTabs();
  const rootRef = useRef(null);
  const sortRef = useRef(null);
  useSectionReveal(rootRef);

  useEffect(() => {
    if (!sortOpen) {
      return undefined;
    }

    const closeSortMenu = (event) => {
      if (event.key === 'Escape') {
        setSortOpen(false);
        return;
      }

      if (
        event.type === 'pointerdown' &&
        !sortRef.current?.contains(event.target)
      ) {
        setSortOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeSortMenu);
    document.addEventListener('keydown', closeSortMenu);

    return () => {
      document.removeEventListener('pointerdown', closeSortMenu);
      document.removeEventListener('keydown', closeSortMenu);
    };
  }, [sortOpen]);

  const remainingCount = videos.length;
  const targetCount = videos.filter(
    (video) => getDdayState(video)?.isNeglected,
  ).length;
  const archivedCount = videos.filter((video) => video.isArchived).length;
  const visibleVideos = videos.filter((video) => {
    if (listTab === 'target') {
      return getDdayState(video)?.isNeglected;
    }

    if (listTab === 'archived') {
      return video.isArchived;
    }

    return true;
  });
  const totalPages = Math.max(1, Math.ceil(visibleVideos.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageVideos = visibleVideos.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const tabCounts = {
    all: remainingCount,
    target: targetCount,
    archived: archivedCount,
  };
  const syncStatus = SYNC_STATUS[syncState] ?? SYNC_STATUS.synced;

  const changeTab = (nextTab) => {
    setListTab(nextTab);
    setPage(1);
  };

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
    <div className="nwl-page video-list-page nwl-reveal-section" ref={rootRef}>
      <div className="nwl-grain" aria-hidden="true" />

      <div className="video-list-page__inner">
        <header className="video-list-page__header">
          <p className="video-list-page__kicker">ARCHIVE / PLAYLIST</p>
          <div className="video-list-page__heading">
            <h1>정리 목록</h1>
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

        <div
          className="video-list-page__tabs-sentinel"
          ref={sentinelRef}
          aria-hidden="true"
        />
      </div>

      <div
        className={
          stuck
            ? 'video-list-page__tabs video-list-page__tabs--stuck'
            : 'video-list-page__tabs'
        }
        role="tablist"
        aria-label="목록 분류"
      >
        {LIST_TABS.map((tab) => {
          const selected = tab.id === listTab;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`video-list-tab-${tab.id}`}
              className={
                selected
                  ? 'video-list-page__tab video-list-page__tab--selected'
                  : 'video-list-page__tab'
              }
              aria-selected={selected}
              aria-label={`${tab.label} ${tabCounts[tab.id]}개`}
              onClick={() => changeTab(tab.id)}
            >
              {tab.label}
              <span
                className={
                  tab.id === 'target'
                    ? 'video-list-page__tab-count video-list-page__tab-count--target'
                    : 'video-list-page__tab-count'
                }
              >
                {tabCounts[tab.id]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="video-list-page__inner video-list-page__toolbar">
        <div className="video-list-page__toolbar-actions">
          <div className="video-list-page__sort" ref={sortRef}>
            <button
              type="button"
              className={
                sortOpen
                  ? 'video-list-page__sort-trigger video-list-page__sort-trigger--open'
                  : 'video-list-page__sort-trigger'
              }
              aria-label="정렬"
              aria-haspopup="listbox"
              aria-expanded={sortOpen}
              onClick={() => setSortOpen((open) => !open)}
            >
              {SORT_OPTIONS.find((option) => option.value === sortValue)?.label}
              <ChevronIcon />
            </button>
            {sortOpen ? (
              <ul
                className="video-list-page__sort-menu"
                role="listbox"
                aria-label="정렬"
              >
                {SORT_OPTIONS.map((option) => {
                  const selected = option.value === sortValue;

                  return (
                    <li key={option.value} role="presentation">
                      <button
                        type="button"
                        role="option"
                        className={
                          selected
                            ? 'video-list-page__sort-option video-list-page__sort-option--selected'
                            : 'video-list-page__sort-option'
                        }
                        aria-selected={selected}
                        onClick={() => {
                          setSortValue(option.value);
                          setSortOpen(false);
                        }}
                      >
                        {option.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
          <button type="button" className="video-list-page__sync-list">
            <SyncIcon />
            목록 동기화
          </button>
        </div>
      </div>

      <div className="video-list-page__inner video-list-page__inner--list">
        {visibleVideos.length === 0 ? (
          <div className="video-list-page__empty">
            <p className="video-list-page__empty-title">
              {listTab === 'archived'
                ? '보관한 영상이 없습니다'
                : '정리할 영상이 없습니다'}
            </p>
            <p className="video-list-page__empty-description">
              {listTab === 'archived'
                ? '보관 탭에는 D-Day 경고를 멈춘 영상만 모입니다.'
                : '유튜브에서 ‘Neverwatchlater’ 재생목록에 영상을 저장하면 다음 동기화에 카드로 표시됩니다.'}
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
    </div>
  );
};

export default VideoListPage;
