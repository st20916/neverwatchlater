import { useState } from 'react';

import { formatDuration } from '../utils/duration.js';
import { getDdayBadge } from '../utils/dday.js';

import './VideoCard.css';

const SUMMARY_STATUS_MESSAGE = {
  pending: 'AI 요약을 생성하고 있습니다.',
  unavailable: '자막을 찾을 수 없어 AI 요약이 불가능한 영상입니다.',
  failed: '요약 생성에 실패했습니다. 잠시 후 다시 시도합니다.',
};

const THUMB_TONES = [
  'linear-gradient(145deg, #4e8f8b, #2b4f4b 52%, #252528)',
  'linear-gradient(145deg, #3d7370, #252528 58%, #1d1d1f)',
  'linear-gradient(145deg, #5a9a96, #2b4f4b 48%, #252528)',
  'linear-gradient(145deg, #4e8f8b, #1d1d1f 62%, #252528)',
];

const PlayIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 12 12"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M2.5 1.2v9.6L11 6 2.5 1.2Z" />
  </svg>
);

const BookmarkIcon = () => (
  <svg
    className="video-card__bookmark"
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M6 3.5A1.5 1.5 0 0 1 7.5 2h9A1.5 1.5 0 0 1 18 3.5v17.2a.8.8 0 0 1-1.22.68L12 18.05l-4.78 3.33A.8.8 0 0 1 6 20.7Z" />
  </svg>
);

const ClockIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="8.25" />
    <path d="M12 8v4.2l2.6 1.6" />
  </svg>
);

const ArchiveIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
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
    <path d="M4 8h16v11H4z" />
    <path d="M3 5h18v3H3z" />
    <path d="M10 13h4" />
  </svg>
);

const CheckIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5.5 12.5 10 17l8.5-9" />
  </svg>
);

const SparkleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12 2.5 13.1 8.7 19.5 10 13.1 11.3 12 17.5 10.9 11.3 4.5 10 10.9 8.7 12 2.5Z" />
    <path d="M18.2 3.8 18.6 6.1 21 6.5 18.6 6.9 18.2 9.2 17.8 6.9 15.4 6.5 17.8 6.1 18.2 3.8Z" />
  </svg>
);

const formatSavedDate = (savedAt) => {
  const date = new Date(savedAt);
  const month = date.getMonth() + 1;
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}월 ${day}일 저장`;
};

const getVideoKey = (video) => video.videoId ?? video.id ?? '';

const getSummaryBody = (video) => {
  if (video.summaryStatus === 'done' && video.summary) {
    return { type: 'list', lines: video.summary };
  }

  if (!video.summaryStatus && video.summary) {
    return { type: 'list', lines: video.summary };
  }

  if (video.summaryStatus === 'unavailable' || video.summary === null) {
    return {
      type: 'message',
      text:
        SUMMARY_STATUS_MESSAGE[video.summaryStatus] ??
        SUMMARY_STATUS_MESSAGE.unavailable,
    };
  }

  return {
    type: 'message',
    text:
      SUMMARY_STATUS_MESSAGE[video.summaryStatus] ??
      SUMMARY_STATUS_MESSAGE.pending,
  };
};

const VideoCard = ({
  video,
  pendingAction = null,
  isRemoving = false,
  isHighlighted = false,
  onWatch,
  onLater,
  onArchive,
  onDelete,
}) => {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const badge = getDdayBadge(video);
  const isBusy = pendingAction !== null;
  const videoKey = getVideoKey(video);
  const toneIndex = [...videoKey].reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  const duration = formatDuration(video.durationSeconds) ?? video.duration;
  const showThumbnail = Boolean(video.thumbnailUrl) && !thumbnailFailed;
  const summary = getSummaryBody(video);
  const archiveLabel = video.isArchived ? '보관취소' : '보관';

  const cardClassName = [
    'video-card',
    isRemoving ? 'video-card--removing' : '',
    isHighlighted ? 'video-card--highlight' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      id={videoKey ? `video-card-${videoKey}` : undefined}
      className={cardClassName}
      tabIndex={-1}
    >
      <div
        className="video-card__thumb"
        style={{ background: THUMB_TONES[toneIndex % THUMB_TONES.length] }}
      >
        {showThumbnail ? (
          <img
            className="video-card__thumbnail"
            src={video.thumbnailUrl}
            alt=""
            onError={() => setThumbnailFailed(true)}
          />
        ) : (
          <span className="video-card__visually-hidden">썸네일 없음</span>
        )}
        {badge ? (
          <span className={`video-card__badge video-card__badge--${badge.tone}`}>
            {badge.tone !== 'archived' ? <ClockIcon /> : null}
            {badge.text}
          </span>
        ) : null}
        <button
          type="button"
          className="video-card__play"
          disabled={isBusy}
          aria-label="바로 보기"
          onClick={() => onWatch(video)}
        >
          <PlayIcon />
        </button>
        {duration ? (
          <span className="video-card__duration">{duration}</span>
        ) : null}
      </div>

      <div className="video-card__body">
        <p className="video-card__source">
          <BookmarkIcon />
          <span className="video-card__channel">{video.channelName}</span>
          <span className="video-card__source-rule" aria-hidden="true" />
          <span className="video-card__saved">{formatSavedDate(video.savedAt)}</span>
        </p>
        <h3>{video.title}</h3>
        <div className="video-card__summary">
          <p className="video-card__summary-label">
            <SparkleIcon />
            AI 3줄 요약
          </p>
          {summary.type === 'list' ? (
            <ul>
              {summary.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="video-card__summary-missing">{summary.text}</p>
          )}
        </div>
        <div className="video-card__actions">
          <button
            type="button"
            className="video-card__action video-card__action--later"
            disabled={isBusy}
            onClick={() => onLater(video)}
          >
            <ClockIcon />
            {pendingAction === 'later' ? '처리 중…' : '나중에'}
          </button>
          <button
            type="button"
            className="video-card__action video-card__action--archive"
            disabled={isBusy}
            onClick={() => onArchive(video)}
          >
            <ArchiveIcon />
            {pendingAction === 'archive' ? '처리 중…' : archiveLabel}
          </button>
          <button
            type="button"
            className="video-card__action video-card__action--done"
            disabled={isBusy}
            onClick={() => onDelete(video)}
          >
            <CheckIcon />
            {pendingAction === 'delete' ? '처리 중…' : '정리완료'}
          </button>
        </div>
      </div>
    </article>
  );
};

export default VideoCard;
