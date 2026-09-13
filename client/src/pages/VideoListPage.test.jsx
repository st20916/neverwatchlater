import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import VideoListPage from './VideoListPage.jsx';

const renderPage = () =>
  render(
    <MemoryRouter>
      <VideoListPage />
    </MemoryRouter>,
  );

const flushActions = async () => {
  await act(async () => {
    vi.advanceTimersByTime(1000);
  });
};

describe('VideoListPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('오래 방치된 영상을 먼저 표시한다', () => {
    renderPage();

    const titles = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);

    expect(titles[0]).toBe('주말 30분으로 끝내는 리액트 상태관리 정리');
  });

  it('안볼래요는 확인 대화상자를 거쳐 카드를 제거한다', async () => {
    renderPage();

    fireEvent.click(screen.getAllByRole('button', { name: '🗑 안볼래요' })[0]);

    const dialog = screen.getByRole('dialog', {
      name: '이 영상을 삭제할까요?',
    });
    expect(dialog).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    await flushActions();

    expect(
      screen.queryByText('주말 30분으로 끝내는 리액트 상태관리 정리'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('청소 완료 1개')).toBeInTheDocument();
  });

  it('확인 대화상자를 취소하면 카드를 유지한다', () => {
    renderPage();

    fireEvent.click(screen.getAllByRole('button', { name: '🗑 안볼래요' })[0]);
    fireEvent.click(screen.getByRole('button', { name: '취소' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByText('주말 30분으로 끝내는 리액트 상태관리 정리'),
    ).toBeInTheDocument();
  });

  it('나중에를 선택하면 저장 일자를 초기화해 방치 경고를 없앤다', async () => {
    renderPage();

    fireEvent.click(screen.getAllByRole('button', { name: '나중에' })[0]);
    await flushActions();

    expect(screen.getByText('D-7 · 저장 후 0일')).toBeInTheDocument();
    expect(screen.getByText('저장 일자를 초기화했습니다.')).toBeInTheDocument();
  });

  it('정리 요청이 실패하면 카드를 유지하고 재시도 안내를 표시한다', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '정리 요청 실패' }));
    fireEvent.click(screen.getAllByRole('button', { name: '나중에' })[0]);
    await flushActions();

    expect(
      screen.getByText(
        '유튜브 서버와 통신 중 오류가 발생했습니다. 다시 시도해 주세요.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('주말 30분으로 끝내는 리액트 상태관리 정리'),
    ).toBeInTheDocument();
  });

  it('동기화 실패 상태에서 재시도 안내를 표시한다', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '동기화 실패' }));

    expect(
      screen.getByText('유튜브와 통신하지 못해 동기화가 중단되었습니다'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '동기화 재시도' }),
    ).toBeInTheDocument();
  });
});
