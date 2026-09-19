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

// 한 페이지에 2x2 형식으로 영상 4개를 보여준다.
const PAGE_SIZE = 4;

const DELETE_ERROR_MESSAGE = '영상을 삭제하지 못했습니다. 다시 시도해 주세요.';
const LATER_ERROR_MESSAGE = '저장 일자를 초기화하지 못했습니다. 다시 시도해 주세요.';
const ARCHIVE_ERROR_MESSAGE = '보관 상태를 변경하지 못했습니다. 다시 시도해 주세요.';

// 탭별 영상 필터. '정리 대상'은 D-Day가 D+0 이상인 방치 영상이며, 보관 영상은
// getDdayState가 방치 판정에서 제외하므로 자동으로 빠진다.
const TAB_FILTERS = {
  all: () => true,
  cleanup: (video) => getDdayState(video)?.isNeglected === true,
  archived: (video) => Boolean(video.isArchived),
};

const TAB_LABELS = {
  all: '전체',
  cleanup: '정리 대상',
  archived: '보관',
};

const EMPTY_TAB_MESSAGE = {
  cleanup: '7일 이상 방치된 영상이 없습니다.',
  archived: '보관한 영상이 없습니다.',
};

// VideoCard.css의 .video-card--removing 트랜지션 시간(0.3s)과 맞춰, 페이드아웃 애니메이션이
// 끝난 뒤에 목록에서 실제로 제거한다.
const REMOVE_ANIMATION_MS = 300;

const formatSyncTime = (iso) => {
  if (!iso) return null;
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

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

  const tabs = Object.keys(TAB_FILTERS).map((id) => ({
    id,
    label: TAB_LABELS[id],
    count: videos.filter(TAB_FILTERS[id]).length,
  }));

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
    window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank', 'noopener,noreferrer');
  };

  // "안볼래요" — 유튜브 재생목록과 로컬 목록 양쪽에서 영상을 제거한다. 성공하면 카드를
  // 페이드아웃시킨 뒤(REMOVE_ANIMATION_MS) 서버가 돌려준 최신 목록으로 교체한다.
  const handleDelete = async (video) => {
    startPending(video.videoId, 'delete');

    try {
      const result = await deleteVideo(video.videoId);

      setRemovingIds((prev) => new Set(prev).add(video.videoId));
      setTimeout(() => {
        setVideos(result.videos);
        setRemovingIds((prev) => {
          const next = new Set(prev);
          next.delete(video.videoId);
          return next;
        });
      }, REMOVE_ANIMATION_MS);
    } catch {
      setToast({ tone: 'error', message: DELETE_ERROR_MESSAGE });
    } finally {
      endPending(video.videoId);
    }
  };

  // "나중에" — 저장 일자를 현재 시각으로 초기화해 방치 경고(D-Day)를 리셋한다.
  const handleLater = async (video) => {
    startPending(video.videoId, 'later');

    try {
      const { video: updated } = await resetVideoDday(video.videoId);
      applyVideoUpdate(updated);
      setToast({ tone: 'success', message: '저장 일자를 초기화했습니다.' });
    } catch {
      setToast({ tone: 'error', message: LATER_ERROR_MESSAGE });
    } finally {
      endPending(video.videoId);
    }
  };

  // "보관하기"/"보관 해제" — 보관하면 D-Day 판정에서 빠지고 보관 탭으로, 해제하면
  // 다시 원래 탭으로 돌아간다(유튜브 재생목록은 건드리지 않는다).
  const handleArchive = async (video) => {
    const nextArchived = !video.isArchived;
    startPending(video.videoId, 'archive');

    try {
      const { video: updated } = await setVideoArchived(video.videoId, nextArchived);
      applyVideoUpdate(updated);
      setToast({
        tone: 'success',
        message: nextArchived ? '영상을 보관했습니다.' : '보관을 해제했습니다.',
      });
    } catch {
      setToast({ tone: 'error', message: ARCHIVE_ERROR_MESSAGE });
    } finally {
      endPending(video.videoId);
    }
  };

  if (status === 'loading') {
    return (
      <section className="tile tile--parchment video-list">
        <div className="tile__inner">
          <StatusNotice
            label="불러오는 중"
            title="영상 목록을 불러오고 있습니다"
            description="전용 재생목록을 확인하고 있어요. 잠시만 기다려 주세요."
          />
        </div>
      </section>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <section className="tile tile--parchment video-list">
        <div className="tile__inner">
          <div className="video-list__empty utility-card">
            <p className="type-body-strong">로그인이 필요합니다</p>
            <p className="type-caption video-list__empty-description">
              정리 목록을 보려면 먼저 Google 계정으로 로그인해 주세요.
            </p>
            <Link to="/" className="btn-primary">
              로그인하러 가기
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (status === 'noPlaylist') {
    return (
      <section className="tile tile--parchment video-list">
        <div className="tile__inner">
          <div className="video-list__empty utility-card">
            <p className="type-body-strong">전용 재생목록이 아직 없습니다</p>
            <p className="type-caption video-list__empty-description">
              ‘Neverwatchlater’ 재생목록을 먼저 설정해야 영상을 동기화할 수 있어요.
            </p>
            <Link to="/playlist-setup" className="btn-primary">
              재생목록 설정하러 가기
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className="tile tile--parchment video-list">
        <div className="tile__inner">
          <StatusNotice
            label="불러오기 실패"
            title="영상 목록을 불러오지 못했습니다"
            description="네트워크 상태를 확인한 뒤 다시 시도해 주세요."
            actionLabel="다시 시도"
            onAction={retryLoad}
          />
        </div>
      </section>
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
        ) : tabVideos.length === 0 ? (
          <div className="video-list__empty utility-card">
            <p className="type-body-strong">{EMPTY_TAB_MESSAGE[activeTab]}</p>
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
