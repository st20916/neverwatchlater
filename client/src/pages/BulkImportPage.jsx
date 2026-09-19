import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchCurrentUser } from '../api/authApi';
import { getPlaylistStatus } from '../api/playlistApi';
import { bulkImportVideos } from '../api/videoApi';
import Toast from '../components/Toast.jsx';
import { countValidVideoUrls } from '../utils/youtubeUrl.js';

import './BulkImportPage.css';

const MAX_URLS_PER_REQUEST = 100;

const STATUS_META = {
  success: { label: '성공', badgeClass: 'bulk-import__badge bulk-import__badge--success' },
  duplicate: { label: '중복', badgeClass: 'bulk-import__badge bulk-import__badge--waiting' },
  invalid: { label: '유효하지 않음', badgeClass: 'bulk-import__badge bulk-import__badge--waiting' },
  failed: { label: '실패', badgeClass: 'bulk-import__badge bulk-import__badge--failed' },
};

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

const getImportedVideoIds = (response) =>
  (response?.results ?? [])
    .filter((item) => item.status === 'success' && item.videoId)
    .map((item) => item.videoId);

/**
 * 대량 링크 등록 화면(PRD 5.1). 로그인 사용자가 여러 유튜브 영상 URL이 포함된 텍스트를
 * 붙여넣으면, 서버가 유효한 영상 URL만 추출해 전용 재생목록에 등록하고 링크별 결과를
 * 돌려준다. 기본 '나중에 볼 동영상' 재생목록에서 직접 이전하는 기능은 포함하지 않는다.
 */
const BulkImportPage = () => {
  // 'loading' | 'unauthenticated' | 'noPlaylist' | 'ready' | 'error'
  const [pageStatus, setPageStatus] = useState('loading');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState(null);

  const loadGate = useCallback(() => {
    fetchCurrentUser()
      .then(() => getPlaylistStatus())
      .then(({ playlist }) => {
        setPageStatus(playlist?.playlistId ? 'ready' : 'noPlaylist');
      })
      .catch(() => {
        setPageStatus('unauthenticated');
      });
  }, []);

  useEffect(() => {
    loadGate();
  }, [loadGate]);

  const validCount = countValidVideoUrls(text);
  const canSubmit = !submitting && validCount > 0 && validCount <= MAX_URLS_PER_REQUEST;
  const importedVideoIds = getImportedVideoIds(result);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setResult(null);

    try {
      const response = await bulkImportVideos(text);
      setResult(response);
      setToast({
        tone: response.failedCount > 0 ? 'error' : 'success',
        message: `등록 완료: 성공 ${response.successCount}건, 실패 ${response.failedCount}건, 유효하지 않음 ${response.invalidCount}건, 중복 ${response.duplicateCount}건`,
      });
    } catch (err) {
      setToast({ tone: 'error', message: err.message || '링크 등록에 실패했습니다.' });
    } finally {
      setSubmitting(false);
    }
  };

  const renderGate = (title, description, action) => (
    <section className="nwl-page bulk-import">
      <div className="nwl-grain" aria-hidden="true" />
      <div className="bulk-import__inner">
        <div className="bulk-import__empty">
          <p className="bulk-import__empty-title">{title}</p>
          <p className="bulk-import__empty-description">{description}</p>
          {action}
        </div>
      </div>
    </section>
  );

  if (pageStatus === 'loading') {
    return renderGate(
      '등록 화면을 준비하고 있습니다',
      '로그인 상태와 전용 재생목록 설정을 확인하고 있어요.',
    );
  }

  if (pageStatus === 'unauthenticated') {
    return renderGate(
      '로그인이 필요합니다',
      '대량 링크 등록을 이용하려면 먼저 Google 계정으로 로그인해 주세요.',
      <Link to="/auth/loading" className="bulk-import__action">
        로그인하러 가기
      </Link>,
    );
  }

  if (pageStatus === 'noPlaylist') {
    return renderGate(
      '전용 재생목록이 아직 없습니다',
      '‘Neverwatchlater’ 전용 재생목록을 먼저 설정해야 링크를 등록할 수 있어요.',
      <Link to="/playlist-setup" className="bulk-import__action">
        재생목록 설정하러 가기
      </Link>,
    );
  }

  return (
    <section className="nwl-page bulk-import">
      <div className="nwl-grain" aria-hidden="true" />

      <div className="bulk-import__inner">
        <header className="bulk-import__header">
          <p className="bulk-import__kicker">ARCHIVE / IMPORT</p>
          <div className="bulk-import__heading">
            <h1>대량 링크 등록</h1>
          </div>
          <p className="bulk-import__description">
            여러 유튜브 영상 URL이 포함된 텍스트를 붙여넣으면, 유효한 영상 URL만 골라
            전용 재생목록에 한 번에 등록합니다. 일반 YouTube URL, youtu.be 단축 URL,
            YouTube Shorts URL을 지원하며, 재생목록 URL과 일반 URL은 등록 대상이 아닙니다.
          </p>
        </header>

        <form className="bulk-import__form" onSubmit={handleSubmit}>
          <label className="bulk-import__label" htmlFor="bulk-import-text">
            유튜브 영상 URL 붙여넣기
          </label>
          <textarea
            id="bulk-import-text"
            className="bulk-import__textarea"
            rows={8}
            placeholder={'https://www.youtube.com/watch?v=...\nhttps://youtu.be/...\nhttps://www.youtube.com/shorts/...'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={submitting}
          />

          <div className="bulk-import__hint">
            <span className="bulk-import__hint-count">
              감지된 유효한 영상 URL: {validCount}개 (최대 {MAX_URLS_PER_REQUEST}개)
            </span>
            {validCount > MAX_URLS_PER_REQUEST ? (
              <span className="bulk-import__hint-warning">
                한 번에 최대 {MAX_URLS_PER_REQUEST}개까지만 등록할 수 있습니다. 텍스트를 나눠서 등록해 주세요.
              </span>
            ) : null}
          </div>

          <div className="bulk-import__actions">
            <Link to="/videos" className="bulk-import__cancel">
              취소
            </Link>
            <button type="submit" className="bulk-import__submit" disabled={!canSubmit}>
              {submitting ? '등록 중…' : '등록하기'}
            </button>
          </div>
        </form>

        {result ? (
          <div className="bulk-import__result">
            {importedVideoIds.length > 0 ? (
              <div className="bulk-import__banner bulk-import__banner--success">
                <p className="bulk-import__banner-title">
                  성공 {result.successCount}건이 전용 재생목록에 등록되었습니다.
                </p>
                <Link
                  to="/videos"
                  state={{ importedVideoIds }}
                  className="bulk-import__action"
                >
                  등록한 영상 보러가기
                  <ArrowUpRight />
                </Link>
              </div>
            ) : (
              <div className="bulk-import__banner bulk-import__banner--muted" role="status">
                <p className="bulk-import__banner-title">
                  새로 등록된 영상이 없습니다.
                </p>
                <p className="bulk-import__banner-detail">
                  중복이거나 유효하지 않은 링크만 있어 재생목록에 추가된 항목이 없어요.
                </p>
              </div>
            )}

            <h2 className="bulk-import__result-heading">등록 결과</h2>
            <p className="bulk-import__result-summary">
              전체 {result.total}건 · 성공 {result.successCount}건 · 중복 {result.duplicateCount}건 ·
              유효하지 않음 {result.invalidCount}건 · 실패 {result.failedCount}건
            </p>

            <ul className="bulk-import__result-list">
              {result.results.map((item, index) => {
                const meta = STATUS_META[item.status] ?? STATUS_META.invalid;
                return (
                  <li key={`${item.url}-${index}`} className="bulk-import__result-item">
                    <span className="bulk-import__result-index" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="bulk-import__result-url">{item.url}</span>
                    <span className={meta.badgeClass}>{meta.label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>

      {toast ? (
        <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />
      ) : null}
    </section>
  );
};

export default BulkImportPage;
