import { getDdayBadge } from '../utils/dday.js';

import './VideoCard.css';

const SUMMARY_UNAVAILABLE_NOTICE =
  '자막을 찾을 수 없어 AI 요약이 불가능한 영상입니다';

const THUMB_TONES = [
  'linear-gradient(145deg, #8c9e99, #2e4947 58%, #b6c5b7)',
  'linear-gradient(145deg, #7f948f, #243f3d 58%, #c5d0bf)',
  'linear-gradient(145deg, #9aa89c, #35524b 58%, #d0d8c8)',
  'linear-gradient(145deg, #6f8884, #1f3533 58%, #b7c4b4)',
];

const PlayIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M2.5 1.2v9.6L11 6 2.5 1.2Z" />
  </svg>
);

const VideoCard = ({
  video,
  pendingAction = null,
  isRemoving = false,
  onWatch,
  onLater,
  onArchive,
  onDelete,
}) => {
  const badge = getDdayBadge(video);
  const isBusy = pendingAction !== null;
  const toneIndex = [...video.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const thumbLabel = video.duration
    ? `YOUTUBE / ${video.duration}`
    : 'YOUTUBE';

  return (
    <article
      className={isRemoving ? 'video-card video-card--removing' : 'video-card'}
    >
      <div
        className="video-card__thumb"
        role="img"
        aria-label="썸네일 없음"
        style={{ background: THUMB_TONES[toneIndex % THUMB_TONES.length] }}
      >
        <div className="video-card__play" aria-hidden="true">
          ▶
        </div>
        <span className="video-card__thumb-label">{thumbLabel}</span>
      </div>

      <div className="video-card__meta">
        <p className="video-card__channel">
          {video.channelName}
          {badge ? (
            <span
              className={`video-card__badge video-card__badge--${badge.tone}`}
            >
              {badge.text}
            </span>
          ) : null}
        </p>
        <h3>{video.title}</h3>
        <div className="video-card__summary">
          <span className="video-card__summary-label">AI 3줄 요약</span>
          {video.summary ? (
            <p>
              {video.summary.map((line) => (
                <span key={line}>
                  • {line}
                  <br />
                </span>
              ))}
            </p>
          ) : (
            <p className="video-card__summary-missing">
              {SUMMARY_UNAVAILABLE_NOTICE}
            </p>
          )}
        </div>
      </div>

      <div className="video-card__actions">
        <button
          type="button"
          className="video-card__action video-card__action--watch"
          disabled={isBusy}
          onClick={() => onWatch(video)}
        >
          <PlayIcon />
          {pendingAction === 'watch' ? '처리 중…' : '바로 보기'}
        </button>
        <button
          type="button"
          className="video-card__action"
          disabled={isBusy}
          onClick={() => onLater(video)}
        >
          {pendingAction === 'later' ? '처리 중…' : '나중에'}
        </button>
        <button
          type="button"
          className="video-card__action"
          disabled={isBusy}
          onClick={() => onDelete(video)}
        >
          {pendingAction === 'delete' ? '처리 중…' : '안볼래요'}
        </button>
        <button
          type="button"
          className="video-card__action"
          disabled={isBusy || video.isArchived}
          onClick={() => onArchive(video)}
        >
          {pendingAction === 'archive' ? '처리 중…' : '보관하기'}
        </button>
      </div>
    </article>
  );
};

export default VideoCard;
