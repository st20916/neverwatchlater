import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { fetchCurrentUser } from '../api/authApi';
import { getPlaylistStatus } from '../api/playlistApi';
import { bulkImportVideos } from '../api/videoApi';
import StatusNotice from '../components/StatusNotice.jsx';
import Toast from '../components/Toast.jsx';
import { countValidVideoUrls } from '../utils/youtubeUrl.js';

import './BulkImportPage.css';

const MAX_URLS_PER_REQUEST = 100;

const STATUS_META = {
  success: { label: '성공', badgeClass: 'badge badge--neutral' },
  duplicate: { label: '중복', badgeClass: 'badge badge--outline' },
  invalid: { label: '유효하지 않음', badgeClass: 'badge badge--outline' },
  failed: { label: '실패', badgeClass: 'badge badge--warning' },
};

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

  const loadGate = () => {
    setPageStatus('loading');
    fetchCurrentUser()
      .then(() => getPlaylistStatus())
      .then(({ playlist }) => {
        setPageStatus(playlist?.playlistId ? 'ready' : 'noPlaylist');
      })
      .catch(() => {
        setPageStatus('unauthenticated');
      });
  };

  useEffect(() => {
    loadGate();
    // 최초 진입 시 한 번만 확인한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validCount = countValidVideoUrls(text);
  const canSubmit = !submitting && validCount > 0 && validCount <= MAX_URLS_PER_REQUEST;

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

  if (pageStatus === 'loading') {
    return (
      <section className="tile tile--parchment bulk-import">
        <div className="tile__inner tile__inner--reading">
          <StatusNotice
            label="확인 중"
            title="등록 화면을 준비하고 있습니다"
            description="로그인 상태와 전용 재생목록 설정을 확인하고 있어요."
          />
        </div>
      </section>
    );
  }

  if (pageStatus === 'unauthenticated') {
    return (
      <section className="tile tile--parchment bulk-import">
        <div className="tile__inner tile__inner--reading">
          <div className="bulk-import__empty utility-card">
            <p className="type-body-strong">로그인이 필요합니다</p>
            <p className="type-caption bulk-import__empty-description">
              대량 링크 등록을 이용하려면 먼저 Google 계정으로 로그인해 주세요.
            </p>
            <Link to="/" className="btn-primary">
              로그인하러 가기
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (pageStatus === 'noPlaylist') {
    return (
      <section className="tile tile--parchment bulk-import">
        <div className="tile__inner tile__inner--reading">
          <div className="bulk-import__empty utility-card">
            <p className="type-body-strong">전용 재생목록이 아직 없습니다</p>
            <p className="type-caption bulk-import__empty-description">
              ‘Neverwatchlater’ 전용 재생목록을 먼저 설정해야 링크를 등록할 수 있어요.
            </p>
            <Link to="/playlist-setup" className="btn-primary">
              재생목록 설정하러 가기
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="tile tile--parchment bulk-import">
      <div className="tile__inner tile__inner--reading">
        <h1 className="type-display-md">대량 링크 등록</h1>
        <p className="type-body bulk-import__description">
          여러 유튜브 영상 URL이 포함된 텍스트를 붙여넣으면, 유효한 영상 URL만 골라
          전용 재생목록에 한 번에 등록합니다. 일반 YouTube URL, youtu.be 단축 URL,
          YouTube Shorts URL을 지원하며, 재생목록 URL과 일반 URL은 등록 대상이 아닙니다.
        </p>

        <form className="bulk-import__form" onSubmit={handleSubmit}>
          <label className="bulk-import__label type-caption-strong" htmlFor="bulk-import-text">
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
            <span className="type-caption bulk-import__hint-count">
              감지된 유효한 영상 URL: {validCount}개 (최대 {MAX_URLS_PER_REQUEST}개)
            </span>
            {validCount > MAX_URLS_PER_REQUEST ? (
              <span className="type-caption bulk-import__hint-warning">
                한 번에 최대 {MAX_URLS_PER_REQUEST}개까지만 등록할 수 있습니다. 텍스트를 나눠서 등록해 주세요.
              </span>
            ) : null}
          </div>

          <button type="submit" className="btn-primary" disabled={!canSubmit}>
            {submitting ? '등록 중…' : '등록하기'}
          </button>
        </form>

        {result ? (
          <div className="bulk-import__result">
            <h2 className="type-tagline">등록 결과</h2>
            <p className="type-caption bulk-import__result-summary">
              전체 {result.total}건 · 성공 {result.successCount}건 · 중복 {result.duplicateCount}건 ·
              유효하지 않음 {result.invalidCount}건 · 실패 {result.failedCount}건
            </p>

            <ul className="bulk-import__result-list">
              {result.results.map((item, index) => {
                const meta = STATUS_META[item.status] ?? STATUS_META.invalid;
                return (
                  <li key={`${item.url}-${index}`} className="bulk-import__result-item utility-card">
                    <span className="type-caption bulk-import__result-url">{item.url}</span>
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
