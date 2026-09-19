import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import {
  deleteVideo,
  fetchVideos,
  resetVideoDday,
  setVideoArchived,
  subscribeToSummaryUpdates,
  syncVideosNow,
} from '../api/videoApi.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import Toast from '../components/Toast.jsx';
import VideoCard from '../components/VideoCard.jsx';
import useSectionReveal from '../hooks/useSectionReveal.js';
import { getDdayState } from '../utils/dday.js';
import { DEFAULT_SORT, SORT_OPTIONS, sortVideos } from '../utils/sortVideos.js';

import './VideoListPage.css';

export const PAGE_SIZE = 5;

const LIST_TABS = [
  { id: 'all', label: '전체' },
  { id: 'target', label: '정리 대상' },
  { id: 'archived', label: '보관' },
];

const TAB_FILTERS = {
  all: () => true,
  target: (video) => getDdayState(video)?.isNeglected === true,
  archived: (video) => Boolean(video.isArchived),
};

const EMPTY_TAB_MESSAGE = {
  target: {
    title: '정리할 영상이 없습니다',
    description: '7일 이상 방치된 영상이 없습니다.',
  },
  archived: {
    title: '보관한 영상이 없습니다',
    description: '보관 탭에는 D-Day 경고를 멈춘 영상만 모입니다.',
  },
};

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

const SYNC_ERROR_MESSAGE =
  '유튜브 서버와 통신 중 오류가 발생했습니다. 다시 시도해 주세요.';
const DELETE_ERROR_MESSAGE = '영상을 삭제하지 못했습니다. 다시 시도해 주세요.';
const LATER_ERROR_MESSAGE = '저장 일자를 초기화하지 못했습니다. 다시 시도해 주세요.';
const ARCHIVE_ERROR_MESSAGE = '보관 상태를 변경하지 못했습니다. 다시 시도해 주세요.';
const REMOVE_ANIMATION_MS = 300;
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

const UploadIcon = () => (
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
    <path d="M12 16V5" />
    <path d="M7 10l5-5 5 5" />
    <path d="M5 19h14" />
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

const getVideoKey = (video) => video.videoId ?? video.id;

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

/**
 * 목록 끝의 센티널이 화면에 들어오면 onLoadMore를 호출한다.
 * 페이지 버튼 대신 스크롤만으로 다음 묶음을 이어 붙이기 위한 훅.
 */
const useInfiniteLoad = (hasMore, onLoadMore) => {
  const sentinelRef = useRef(null);
  const onLoadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMoreRef.current();
        }
      },
      { rootMargin: '0px 0px 200px 0px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  return sentinelRef;
};

const VideoListPage = () => {
  const location = useLocation();
  const importedVideoIds = useMemo(() => {
    const ids = location.state?.importedVideoIds;
    return Array.isArray(ids) ? ids.filter(Boolean) : [];
  }, [location.state]);
  const importedVideoIdSet = useMemo(
    () => new Set(importedVideoIds),
    [importedVideoIds],
  );
  const [status, setStatus] = useState('loading');
  const [videos, setVideos] = useState([]);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [syncFailed, setSyncFailed] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sortKey, setSortKey] = useState(
    importedVideoIds.length > 0 ? 'savedRecent' : DEFAULT_SORT,
  );
  const [sortOpen, setSortOpen] = useState(false);
  const [listTab, setListTab] = useState('all');
  const [pendingActions, setPendingActions] = useState(() => new Map());
  const [removingIds, setRemovingIds] = useState(() => new Set());
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [toast, setToast] = useState(null);
  const { sentinelRef, stuck } = useStuckTabs();
  const rootRef = useRef(null);
  const sortRef = useRef(null);
  const importPageAppliedRef = useRef(false);
  const importFocusAppliedRef = useRef(false);
  useSectionReveal(rootRef);

  const applyResult = useCallback((result) => {
    setVideos(result.videos);
    setLastSyncedAt(result.lastSyncedAt);
    setSyncFailed(Boolean(result.syncFailed));

    if (!importPageAppliedRef.current && importedVideoIds.length > 0) {
      const sorted = sortVideos(
        result.videos.filter(TAB_FILTERS.all),
        'savedRecent',
      );
      const firstIndex = sorted.findIndex((video) =>
        importedVideoIds.includes(getVideoKey(video)),
      );
      importPageAppliedRef.current = true;
      setVisibleCount(
        firstIndex >= 0
          ? Math.ceil((firstIndex + 1) / PAGE_SIZE) * PAGE_SIZE
          : PAGE_SIZE,
      );
      return;
    }

    setVisibleCount(PAGE_SIZE);
  }, [importedVideoIds]);

  const visibleVideos = sortVideos(
    videos.filter(TAB_FILTERS[listTab]),
    sortKey,
  );
  const pageVideos = visibleVideos.slice(0, visibleCount);
  const hasMore = visibleCount < visibleVideos.length;
  const loadMoreRef = useInfiniteLoad(hasMore, () =>
    setVisibleCount((count) => count + PAGE_SIZE),
  );
  const tabCounts = {
    all: videos.length,
    target: videos.filter(TAB_FILTERS.target).length,
    archived: videos.filter(TAB_FILTERS.archived).length,
  };
  const syncState = syncing ? 'syncing' : syncFailed ? 'failed' : 'synced';
  const syncStatus = SYNC_STATUS[syncState];

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

  useEffect(() => {
    if (
      importFocusAppliedRef.current ||
      status !== 'ready' ||
      importedVideoIds.length === 0
    ) {
      return undefined;
    }

    const firstVisible = pageVideos.find((video) =>
      importedVideoIds.includes(getVideoKey(video)),
    );
    if (!firstVisible) {
      return undefined;
    }

    const card = document.getElementById(
      `video-card-${getVideoKey(firstVisible)}`,
    );
    if (!card) {
      return undefined;
    }

    importFocusAppliedRef.current = true;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.focus({ preventScroll: true });
    return undefined;
  }, [importedVideoIds, pageVideos, status]);

  const load = useCallback(() => {
    fetchVideos()
      .then((result) => {
        applyResult(result);
        setStatus('ready');
      })
      .catch((err) => {
        if (err.status === 401) {
          setStatus('unauthenticated');
        } else if (err.status === 409) {
          setStatus('noPlaylist');
        } else {
          setStatus('error');
        }
      });
  }, [applyResult]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (status !== 'ready') {
      return undefined;
    }

    return subscribeToSummaryUpdates(({ videoId, summaryStatus, summary }) => {
      setVideos((prev) =>
        prev.map((video) =>
          getVideoKey(video) === videoId
            ? { ...video, summaryStatus, summary }
            : video,
        ),
      );
    });
  }, [status]);

  const startPending = (videoId, action) =>
    setPendingActions((prev) => new Map(prev).set(videoId, action));

  const endPending = (videoId) =>
    setPendingActions((prev) => {
      const next = new Map(prev);
      next.delete(videoId);
      return next;
    });

  const applyVideoUpdate = (updatedVideo) =>
    setVideos((prev) =>
      prev.map((video) =>
        getVideoKey(video) === getVideoKey(updatedVideo)
          ? { ...video, ...updatedVideo }
          : video,
      ),
    );

  const handleRetrySync = () => {
    setSyncing(true);
    syncVideosNow()
      .then((result) => {
        applyResult(result);
        setToast(
          result.syncFailed
            ? { tone: 'error', message: SYNC_ERROR_MESSAGE }
            : { tone: 'success', message: '동기화를 완료했습니다.' },
        );
      })
      .catch(() => {
        setToast({ tone: 'error', message: SYNC_ERROR_MESSAGE });
      })
      .finally(() => {
        setSyncing(false);
      });
  };

  const handleWatch = (video) => {
    window.open(
      `https://www.youtube.com/watch?v=${getVideoKey(video)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const handleLater = (video) => {
    const videoId = getVideoKey(video);
    startPending(videoId, 'later');

    resetVideoDday(videoId)
      .then(({ video: updated }) => {
        applyVideoUpdate(updated);
        setToast({ tone: 'success', message: '저장 일자를 초기화했습니다.' });
      })
      .catch(() => {
        setToast({ tone: 'error', message: LATER_ERROR_MESSAGE });
      })
      .finally(() => {
        endPending(videoId);
      });
  };

  const handleArchive = (video) => {
    const videoId = getVideoKey(video);
    const nextArchived = !video.isArchived;
    startPending(videoId, 'archive');

    setVideoArchived(videoId, nextArchived)
      .then(({ video: updated }) => {
        applyVideoUpdate(updated);
        setToast({
          tone: 'success',
          message: nextArchived ? '영상을 보관했습니다.' : '보관을 해제했습니다.',
        });
      })
      .catch(() => {
        setToast({ tone: 'error', message: ARCHIVE_ERROR_MESSAGE });
      })
      .finally(() => {
        endPending(videoId);
      });
  };

  const handleDeleteConfirmed = () => {
    const video = confirmTarget;
    setConfirmTarget(null);
    const videoId = getVideoKey(video);
    startPending(videoId, 'delete');

    deleteVideo(videoId)
      .then((result) => {
        setRemovingIds((prev) => new Set(prev).add(videoId));
        setTimeout(() => {
          setVideos(result.videos);
          setRemovingIds((prev) => {
            const next = new Set(prev);
            next.delete(videoId);
            return next;
          });
        }, REMOVE_ANIMATION_MS);
      })
      .catch(() => {
        setToast({ tone: 'error', message: DELETE_ERROR_MESSAGE });
      })
      .finally(() => {
        endPending(videoId);
      });
  };

  const emptyCopy =
    listTab === 'all'
      ? {
          title:
            videos.length === 0
              ? '정리할 영상이 없습니다'
              : '정리할 영상이 없습니다',
          description:
            '유튜브에서 ‘Neverwatchlater’ 재생목록에 영상을 저장하면 다음 동기화에 카드로 표시됩니다.',
        }
      : EMPTY_TAB_MESSAGE[listTab];

  const renderGate = (title, description, action) => (
    <div className="nwl-page video-list-page nwl-reveal-section" ref={rootRef}>
      <div className="nwl-grain" aria-hidden="true" />
      <div className="video-list-page__inner video-list-page__inner--list">
        <div className="video-list-page__empty">
          <p className="video-list-page__empty-title">{title}</p>
          <p className="video-list-page__empty-description">{description}</p>
          {action}
        </div>
      </div>
    </div>
  );

  if (status === 'loading') {
    return renderGate(
      '영상 목록을 불러오고 있습니다',
      '전용 재생목록을 확인하고 있어요. 잠시만 기다려 주세요.',
    );
  }

  if (status === 'unauthenticated') {
    return renderGate(
      '로그인이 필요합니다',
      '정리 목록을 보려면 먼저 Google 계정으로 로그인해 주세요.',
      <Link to="/auth/loading" className="video-list-page__retry">
        로그인하러 가기
      </Link>,
    );
  }

  if (status === 'noPlaylist') {
    return renderGate(
      '전용 재생목록이 아직 없습니다',
      '‘Neverwatchlater’ 재생목록을 먼저 설정해야 영상을 동기화할 수 있어요.',
      <Link to="/playlist-setup" className="video-list-page__retry">
        재생목록 설정하러 가기
      </Link>,
    );
  }

  if (status === 'error') {
    return renderGate(
      '영상 목록을 불러오지 못했습니다',
      '네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
      <button
        type="button"
        className="video-list-page__retry"
        onClick={() => {
          setStatus('loading');
          load();
        }}
      >
        다시 시도
      </button>,
    );
  }

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
            <p className="video-list-page__sync-detail">
              {lastSyncedAt
                ? `마지막 동기화: ${new Date(lastSyncedAt).toLocaleString('ko-KR', {
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : syncStatus.detail}
            </p>
          </div>
          {syncFailed ? (
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
              onClick={() => {
                setListTab(tab.id);
                setVisibleCount(PAGE_SIZE);
              }}
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
              <ChevronIcon />
              {SORT_OPTIONS.find((option) => option.value === sortKey)?.label}
            </button>
            {sortOpen ? (
              <ul
                className="video-list-page__sort-menu"
                role="listbox"
                aria-label="정렬"
              >
                {SORT_OPTIONS.map((option) => {
                  const selected = option.value === sortKey;

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
                          setSortKey(option.value);
                          setSortOpen(false);
                          setVisibleCount(PAGE_SIZE);
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
          <button
            type="button"
            className="video-list-page__sync-list"
            disabled={syncing}
            onClick={handleRetrySync}
          >
            <SyncIcon />
            {syncing ? '동기화 중…' : '목록 동기화'}
          </button>
          <Link to="/videos/bulk-import" className="video-list-page__sync-list">
            <UploadIcon />
            링크 대량 등록
          </Link>
        </div>
      </div>

      <div className="video-list-page__inner video-list-page__inner--list">
        {visibleVideos.length === 0 ? (
          <div className="video-list-page__empty">
            <p className="video-list-page__empty-title">{emptyCopy.title}</p>
            <p className="video-list-page__empty-description">
              {emptyCopy.description}
            </p>
          </div>
        ) : (
          <>
            <ul className="video-list-page__items">
              {pageVideos.map((video) => {
                const videoId = getVideoKey(video);

                const isHighlighted = importedVideoIdSet.has(videoId);

                return (
                  <li
                    key={videoId}
                    className={
                      isHighlighted
                        ? 'video-list-page__item video-list-page__item--highlight'
                        : 'video-list-page__item'
                    }
                  >
                    <VideoCard
                      video={video}
                      pendingAction={pendingActions.get(videoId) ?? null}
                      isRemoving={removingIds.has(videoId)}
                      isHighlighted={isHighlighted}
                      onWatch={handleWatch}
                      onLater={handleLater}
                      onArchive={handleArchive}
                      onDelete={setConfirmTarget}
                    />
                  </li>
                );
              })}
            </ul>

            {hasMore ? (
              <div
                className="video-list-page__load-more"
                ref={loadMoreRef}
                aria-hidden="true"
              />
            ) : null}
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
