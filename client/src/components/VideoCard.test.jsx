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
  it('7일 이상 방치된 영상에 D-Day 경고를 표시한다', () => {
    renderCard(baseVideo);

    expect(screen.getByText('D+3 · 7일 경과 청소 대상')).toBeInTheDocument();
    expect(screen.getByText('방치 경고')).toBeInTheDocument();
  });

  it('7일 미만 영상에는 방치 경고를 표시하지 않는다', () => {
    renderCard({ ...baseVideo, savedAt: daysAgo(3) });

    expect(screen.getByText('D-4 · 저장 후 3일')).toBeInTheDocument();
    expect(screen.queryByText('방치 경고')).not.toBeInTheDocument();
  });

  it('보관 상태 영상은 D-Day 판정에서 제외하고 보관 해제 버튼을 표시한다', () => {
    renderCard({ ...baseVideo, isArchived: true });

    expect(screen.getByText('보관 중 · D-Day 제외')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '보관 해제' })).toBeInTheDocument();
    expect(screen.queryByText('방치 경고')).not.toBeInTheDocument();
  });

  it('썸네일을 클릭하면 바로 보기 핸들러를 호출한다', () => {
    const onWatch = vi.fn();
    renderCard(baseVideo, { onWatch });

    fireEvent.click(screen.getByRole('button', { name: '테스트 영상 유튜브에서 보기' }));

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

  it('썸네일 URL이 없으면 회색 플레이스홀더를 표시한다', () => {
    renderCard(baseVideo);

    expect(screen.getByRole('img', { name: '썸네일 없음' })).toBeInTheDocument();
  });

  it('썸네일 URL이 있으면 이미지를 표시하고 길이를 오버레이로 보여준다', () => {
    // 썸네일 이미지는 클릭 버튼(aria-label)이 이름을 담당하므로 alt=""인 장식용 이미지다.
    const { container } = renderCard({
      ...baseVideo,
      thumbnailUrl: 'https://thumb.example/1.jpg',
    });

    const image = container.querySelector('.video-card__thumbnail');
    expect(image).toHaveAttribute('src', 'https://thumb.example/1.jpg');
    expect(screen.getByText('12:34')).toBeInTheDocument();
  });

  it('액션 버튼을 누르면 해당 핸들러를 호출한다', () => {
    const onDelete = vi.fn();
    renderCard(baseVideo, { onDelete });

    fireEvent.click(screen.getByRole('button', { name: '🗑 안볼래요' }));

    expect(onDelete).toHaveBeenCalledWith(baseVideo);
  });

  it('요청 처리 중에는 정리 액션을 비활성화한다', () => {
    renderCard(baseVideo, { pendingAction: 'delete' });

    expect(screen.getByRole('button', { name: '보관하기' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '나중에' })).toBeDisabled();
  });
});
