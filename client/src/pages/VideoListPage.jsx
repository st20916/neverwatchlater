import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchVideos, syncVideosNow } from '../api/videoApi.js';
import StatusNotice from '../components/StatusNotice.jsx';
import Toast from '../components/Toast.jsx';
import VideoCard from '../components/VideoCard.jsx';
import { getElapsedDays } from '../utils/dday.js';

import './VideoListPage.css';

const SYNC_ERROR_MESSAGE =
  '유튜브 서버와 통신 중 오류가 발생했습니다. 다시 시도해 주세요.';

// 바로 보기를 제외한 나머지 액션(나중에/보관하기/안볼래요)은 PRD 4번(정리 액션) 파트에서
// 실제 동작을 연결한다. 이 화면에서는 자리만 배치하고 안내 토스트만 띄운다.
const PLACEHOLDER_TOAST = {
  tone: 'success',
  message: '이 기능은 아직 연결되지 않았습니다. 곧 제공될 예정입니다.',
};

const sortByNeglected = (videos) =>
  [...videos].sort(
    (a, b) => getElapsedDays(b.savedAt) - getElapsedDays(a.savedAt),
  );

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

  const applyResult = (result) => {
    setVideos(sortByNeglected(result.videos));
    setLastSyncedAt(result.lastSyncedAt);
    setSyncFailed(result.syncFailed);
  };

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

  const showPlaceholder = () => setToast(PLACEHOLDER_TOAST);

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
              전용 재생목록에서 동기화된 영상입니다. 오래 방치된 영상이 위에
              표시됩니다.
            </p>
          </div>
          <div className="video-list__meta">
            {lastSyncedAt ? (
              <span className="type-caption video-list__synced-at">
                마지막 동기화: {formatSyncTime(lastSyncedAt)}
              </span>
            ) : null}
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
              <li key={video.videoId}>
                <VideoCard
                  video={video}
                  onWatch={handleWatch}
                  onLater={showPlaceholder}
                  onArchive={showPlaceholder}
                  onDelete={showPlaceholder}
                />
              </li>
            ))}
          </ul>
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
