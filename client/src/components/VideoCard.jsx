import { useState } from 'react';

import MediaPlaceholder from './MediaPlaceholder.jsx';
import { getDdayState } from '../utils/dday.js';
import { formatDuration } from '../utils/duration.js';

import './VideoCard.css';

// PRD 2.2 상태별 안내 문구(pending/unavailable/failed). done은 summary 배열을 그대로 표시한다.
const SUMMARY_STATUS_MESSAGE = {
  pending: 'AI 요약을 생성하고 있습니다.',
  unavailable: '자막을 찾을 수 없어 AI 요약이 불가능한 영상입니다.',
  failed: '요약 생성에 실패했습니다. 잠시 후 다시 시도합니다.',
};

const VideoCard = ({
  video,
  pendingAction = null,
  isRemoving = false,
  onWatch,
  onLater,
  onArchive,
  onDelete,
}) => {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const dday = getDdayState(video);
  const isBusy = pendingAction !== null;
  const duration = formatDuration(video.durationSeconds);
  const showThumbnail = video.thumbnailUrl && !thumbnailFailed;

  return (
    <article
      className={
        isRemoving ? 'video-card utility-card video-card--removing' : 'video-card utility-card'
      }
    >
      <div className="video-card__media">
        {showThumbnail ? (
          <img
            className="video-card__thumbnail"
            src={video.thumbnailUrl}
            alt={video.title}
            onError={() => setThumbnailFailed(true)}
          />
        ) : (
          <MediaPlaceholder label="썸네일 없음" ratio="16/9" radius="sm" />
        )}
        {duration ? (
          <span className="video-card__duration">{duration}</span>
        ) : null}
      </div>

      <div className="video-card__content">
        <div className="video-card__meta">
          {dday ? (
            <span className={`badge badge--${dday.tone}`}>{dday.label}</span>
          ) : null}
          {dday?.isNeglected ? (
            <span className="badge badge--outline">방치 경고</span>
          ) : null}
        </div>

        <h3 className="type-body-strong video-card__title">{video.title}</h3>
        <p className="type-caption video-card__channel">{video.channelName}</p>

        {video.summaryStatus === 'done' && video.summary ? (
          <ul className="video-card__summary">
            {video.summary.map((line) => (
              <li key={line} className="type-body video-card__summary-line">
                {line}
              </li>
            ))}
          </ul>
        ) : (
          <p className="type-body video-card__summary-missing">
            {SUMMARY_STATUS_MESSAGE[video.summaryStatus] ?? SUMMARY_STATUS_MESSAGE.pending}
          </p>
        )}

        <div className="video-card__actions">
          <button
            type="button"
            className="btn-primary"
            disabled={isBusy}
            onClick={() => onWatch(video)}
          >
            {pendingAction === 'watch' ? '처리 중…' : '▶ 바로 보기'}
          </button>
          <button
            type="button"
            className="btn-pearl-capsule"
            disabled={isBusy}
            onClick={() => onLater(video)}
          >
            {pendingAction === 'later' ? '처리 중…' : '나중에'}
          </button>
          <button
            type="button"
            className="btn-pearl-capsule"
            disabled={isBusy || video.isArchived}
            onClick={() => onArchive(video)}
          >
            {pendingAction === 'archive' ? '처리 중…' : '보관하기'}
          </button>
          <button
            type="button"
            className="btn-pearl-capsule"
            disabled={isBusy}
            onClick={() => onDelete(video)}
          >
            {pendingAction === 'delete' ? '처리 중…' : '🗑 안볼래요'}
          </button>
        </div>
      </div>
    </article>
  );
};

export default VideoCard;
