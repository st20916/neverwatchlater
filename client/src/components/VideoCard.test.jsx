import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import VideoCard from './VideoCard.jsx';

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const baseVideo = {
  videoId: 'v1',
  title: '테스트 영상',
  channelName: '테스트 채널',
  savedAt: daysAgo(10),
  isArchived: false,
  durationSeconds: 754,
  thumbnailUrl: '',
  summaryStatus: 'done',
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
  it('7일을 초과한 영상에 D-Day 경고를 표시한다', () => {
    // 10일 전 저장 → 저장 당일 D+1이므로 D+11
    renderCard(baseVideo);

    const badge = screen.getByText('D+11');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('video-card__badge--warning');
  });

  it('7일 이하 영상에는 방치 경고를 표시하지 않는다', () => {
    renderCard({ ...baseVideo, savedAt: daysAgo(3) });

    const badge = screen.getByText('D+04');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('video-card__badge--neutral');
  });

  it('보관 상태 영상은 D-Day 판정에서 제외하고 보관취소를 제공한다', () => {
    renderCard({ ...baseVideo, isArchived: true });

    expect(screen.getByText('보관됨')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '보관취소' })).toBeEnabled();
  });

  it('바로 보기 버튼을 누르면 핸들러를 호출한다', () => {
    const onWatch = vi.fn();
    renderCard(baseVideo, { onWatch });

    fireEvent.click(screen.getByRole('button', { name: '바로 보기' }));

    expect(onWatch).toHaveBeenCalledWith(baseVideo);
  });

  it('요약 완료 상태에서는 3줄 요약을 표시한다', () => {
    renderCard(baseVideo);

    expect(screen.getByText('첫 줄 요약')).toBeInTheDocument();
    expect(screen.getByText('세 번째 줄 요약')).toBeInTheDocument();
  });

  it('요약 대기 상태에는 생성 중 안내를 표시한다', () => {
    renderCard({ ...baseVideo, summaryStatus: 'pending', summary: null });

    expect(screen.getByText('AI 요약을 생성하고 있습니다.')).toBeInTheDocument();
  });

  it('자막이 없는 영상에는 요약 불가 안내를 표시한다', () => {
    renderCard({ ...baseVideo, summaryStatus: 'unavailable', summary: null });

    expect(
      screen.getByText('자막을 찾을 수 없어 AI 요약이 불가능한 영상입니다.'),
    ).toBeInTheDocument();
  });

  it('요약 생성에 실패하면 재시도 안내를 표시한다', () => {
    renderCard({ ...baseVideo, summaryStatus: 'failed', summary: null });

    expect(
      screen.getByText('요약 생성에 실패했습니다. 잠시 후 다시 시도합니다.'),
    ).toBeInTheDocument();
  });

  it('썸네일 자리에 플레이스홀더를 표시한다', () => {
    renderCard(baseVideo);

    expect(screen.getByText('썸네일 없음')).toBeInTheDocument();
  });

  it('플랫폼 배지를 표시하지 않는다', () => {
    renderCard(baseVideo);

    expect(screen.queryByText('YOUTUBE')).not.toBeInTheDocument();
  });

  it('썸네일 URL이 있으면 이미지를 표시하고 길이를 오버레이로 보여준다', () => {
    const { container } = renderCard({
      ...baseVideo,
      thumbnailUrl: 'https://thumb.example/1.jpg',
    });

    const image = container.querySelector('.video-card__thumbnail');
    expect(image).toHaveAttribute('src', 'https://thumb.example/1.jpg');
    expect(screen.getByText('12:34')).toBeInTheDocument();
    expect(screen.queryByText('썸네일 없음')).not.toBeInTheDocument();
  });

  it('액션 버튼을 누르면 해당 핸들러를 호출한다', () => {
    const onDelete = vi.fn();
    renderCard(baseVideo, { onDelete });

    fireEvent.click(screen.getByRole('button', { name: '안볼래요' }));

    expect(onDelete).toHaveBeenCalledWith(baseVideo);
  });

  it('하이라이트되면 해당 카드에 강조 클래스를 붙인다', () => {
    const { container } = renderCard(baseVideo, { isHighlighted: true });
    const card = container.querySelector('#video-card-v1');

    expect(card).toHaveClass('video-card--highlight');
  });

  it('요청 처리 중에는 정리 액션을 비활성화한다', () => {
    renderCard(baseVideo, { pendingAction: 'delete' });

    expect(screen.getByRole('button', { name: '바로 보기' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '나중에' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '보관' })).toBeDisabled();
  });
});
