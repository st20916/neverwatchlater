import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import VideoCard from './VideoCard.jsx';

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const baseVideo = {
  id: 'v1',
  title: '테스트 영상',
  channelName: '테스트 채널',
  savedAt: daysAgo(10),
  isArchived: false,
  summary: ['첫 줄 요약', '두 번째 줄 요약', '세 번째 줄 요약'],
};

const noop = () => {};

const renderCard = (video, props = {}) =>
  render(
    <VideoCard
      video={video}
      onWatch={noop}
      onLater={noop}
      onArchive={noop}
      onDelete={noop}
      {...props}
    />,
  );

describe('VideoCard', () => {
  it('7일 이상 방치된 영상에 D-Day 경고를 표시한다', () => {
    renderCard(baseVideo);

    const badge = screen.getByText('D+03');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('video-card__badge--warning');
  });

  it('7일 미만 영상에는 방치 경고를 표시하지 않는다', () => {
    renderCard({ ...baseVideo, savedAt: daysAgo(3) });

    const badge = screen.getByText('D-04');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('video-card__badge--neutral');
    expect(screen.queryByText('D+03')).not.toBeInTheDocument();
  });

  it('보관 상태 영상은 D-Day 판정에서 제외한다', () => {
    renderCard({ ...baseVideo, isArchived: true });

    expect(screen.getByText('보관됨')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '보관' })).toBeDisabled();
  });

  it('자막이 없는 영상에는 요약 불가 안내를 표시한다', () => {
    renderCard({ ...baseVideo, summary: null });

    expect(
      screen.getByText('자막을 찾을 수 없어 AI 요약이 불가능한 영상입니다'),
    ).toBeInTheDocument();
  });

  it('썸네일 자리에 회색 플레이스홀더를 표시한다', () => {
    renderCard(baseVideo);

    expect(screen.getByText('썸네일 없음')).toBeInTheDocument();
  });

  it('액션 버튼을 누르면 해당 핸들러를 호출한다', () => {
    const onDelete = vi.fn();
    renderCard(baseVideo, { onDelete });

    fireEvent.click(screen.getByRole('button', { name: '안볼래요' }));

    expect(onDelete).toHaveBeenCalledWith(baseVideo);
  });

  it('요청 처리 중에는 정리 액션을 비활성화한다', () => {
    renderCard(baseVideo, { pendingAction: 'delete' });

    expect(screen.getByRole('button', { name: '바로 보기' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '나중에' })).toBeDisabled();
  });
});
