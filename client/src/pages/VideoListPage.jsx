import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  deleteVideo,
  fetchVideos,
  resetVideoDday,
  setVideoArchived,
  subscribeToSummaryUpdates,
  syncVideosNow,
} from '../api/videoApi.js';
import Pagination from '../components/Pagination.jsx';
import StatusNotice from '../components/StatusNotice.jsx';
import Toast from '../components/Toast.jsx';
import VideoCard from '../components/VideoCard.jsx';
import VideoTabs from '../components/VideoTabs.jsx';
import { getDdayState } from '../utils/dday.js';
import { DEFAULT_SORT, SORT_OPTIONS, sortVideos } from '../utils/sortVideos.js';

import './VideoListPage.css';

const SYNC_ERROR_MESSAGE =
  '유튜브 서버와 통신 중 오류가 발생했습니다. 다시 시도해 주세요.';

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

const VideoListPage = () => {
  const [status, setStatus] = useState('loading'); // loading | ready | unauthenticated | noPlaylist | error
  const [videos, setVideos] = useState([]);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [syncFailed, setSyncFailed] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState(DEFAULT_SORT);
  const [activeTab, setActiveTab] = useState('all');
  // videoId → 진행 중인 액션('delete' | 'archive' | 'later'). 카드 버튼 로딩 표시에 쓴다.
  const [pendingActions, setPendingActions] = useState(() => new Map());
  const [removingIds, setRemovingIds] = useState(() => new Set());

  const applyResult = (result) => {
    setVideos(result.videos);
    setLastSyncedAt(result.lastSyncedAt);
    setSyncFailed(result.syncFailed);
    setPage(1);
  };

  const tabs = Object.keys(TAB_FILTERS).map((id) => ({
    id,
    label: TAB_LABELS[id],
    count: videos.filter(TAB_FILTERS[id]).length,
  }));

  const tabVideos = videos.filter(TAB_FILTERS[activeTab]);
  const sortedVideos = sortVideos(tabVideos, sortKey);
  const totalPages = Math.max(1, Math.ceil(sortedVideos.length / PAGE_SIZE));
  const pagedVideos = sortedVideos.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSortChange = (e) => {
    setSortKey(e.target.value);
    setPage(1);
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setPage(1);
  };

  const startPending = (videoId, action) =>
    setPendingActions((prev) => new Map(prev).set(videoId, action));

  const endPending = (videoId) =>
    setPendingActions((prev) => {
      const next = new Map(prev);
      next.delete(videoId);
      return next;
    });

  // 서버가 돌려준 갱신된 영상 하나만 목록에 반영한다(정렬/탭 분류는 렌더 시 다시 계산됨).
  const applyVideoUpdate = (updatedVideo) =>
    setVideos((prev) =>
      prev.map((video) =>
        video.videoId === updatedVideo.videoId ? { ...video, ...updatedVideo } : video,
      ),
    );

  // 동기화 등으로 videos가 줄어들어 현재 페이지가 범위를 벗어나면 마지막 페이지로 보정한다.
  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  // 로딩 상태는 useState 초기값이 이미 담당하므로, 여기서는 setState를 먼저 호출하지 않고
  // 곧바로 요청부터 시작한다(재시도 시의 로딩 표시는 retryLoad에서 별도로 처리).
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
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 백그라운드 AI 요약이 영상 하나씩 끝날 때마다 새로고침 없이 해당 카드만 갱신한다.
  useEffect(() => {
    if (status !== 'ready') return undefined;

    return subscribeToSummaryUpdates(({ videoId, summaryStatus, summary }) => {
      setVideos((prev) =>
        prev.map((video) =>
          video.videoId === videoId ? { ...video, summaryStatus, summary } : video,
        ),
      );
    });
  }, [status]);

  const retryLoad = () => {
    setStatus('loading');
    load();
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const result = await syncVideosNow();
      applyResult(result);
      setToast(
        result.syncFailed
          ? { tone: 'error', message: SYNC_ERROR_MESSAGE }
          : { tone: 'success', message: '동기화를 완료했습니다.' },
      );
    } catch {
      setToast({ tone: 'error', message: SYNC_ERROR_MESSAGE });
    } finally {
      setSyncing(false);
    }
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
    <section className="tile tile--parchment video-list">
      <div className="tile__inner">
        <header className="video-list__header">
          <div>
            <h1 className="type-display-md">정리 목록</h1>
            <p className="type-body video-list__description">
              전용 재생목록에서 동기화된 영상입니다.
            </p>
          </div>
          <div className="video-list__meta">
            {lastSyncedAt ? (
              <span className="type-caption video-list__synced-at">
                마지막 동기화: {formatSyncTime(lastSyncedAt)}
              </span>
            ) : null}
            <label className="video-list__sort">
              <span className="type-caption video-list__sort-label">정렬</span>
              <select
                className="video-list__sort-select"
                value={sortKey}
                onChange={handleSortChange}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn-pearl-capsule"
              disabled={syncing}
              onClick={handleSyncNow}
            >
              {syncing ? '동기화 중…' : '지금 동기화'}
            </button>
          </div>
        </header>

        {syncFailed ? (
          <StatusNotice
            label="동기화 실패"
            title="유튜브와 통신하지 못해 동기화가 중단되었습니다"
            description="기존 카드는 그대로 유지됩니다. 다음 주기에 다시 시도하거나 지금 재시도할 수 있습니다."
            actionLabel="동기화 재시도"
            onAction={handleSyncNow}
          />
        ) : null}

        <VideoTabs tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />

        {videos.length === 0 ? (
          <div className="video-list__empty utility-card">
            <p className="type-body-strong">정리할 영상이 없습니다</p>
            <p className="type-caption video-list__empty-description">
              유튜브에서 ‘Neverwatchlater’ 재생목록에 영상을 저장하면 다음
              동기화에 카드로 표시됩니다.
            </p>
          </div>
        ) : tabVideos.length === 0 ? (
          <div className="video-list__empty utility-card">
            <p className="type-body-strong">{EMPTY_TAB_MESSAGE[activeTab]}</p>
          </div>
        ) : (
          <>
            <ul className="video-list__items">
              {pagedVideos.map((video) => (
                <li key={video.videoId}>
                  <VideoCard
                    video={video}
                    pendingAction={pendingActions.get(video.videoId) ?? null}
                    isRemoving={removingIds.has(video.videoId)}
                    onWatch={handleWatch}
                    onLater={handleLater}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                  />
                </li>
              ))}
            </ul>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
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
    </section>
  );
};

export default VideoListPage;
