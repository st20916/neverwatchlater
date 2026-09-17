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

const titlesOnPage = () =>
  screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);

describe('VideoListPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('오래 방치된 영상을 먼저 표시한다', () => {
    renderPage();

    expect(titlesOnPage()[0]).toBe('주말 30분으로 끝내는 리액트 상태관리 정리');
  });

  it('남은 영상과 청소 대상, 청소 완료 개수를 보여준다', () => {
    renderPage();

    expect(screen.getByText('청소 완료 0개')).toBeInTheDocument();
    expect(screen.getByText('남은 영상 12개')).toBeInTheDocument();
    expect(screen.getByText('청소 대상 7개')).toBeInTheDocument();
  });

  it('한 페이지에 카드 5장만 보여주고 다음 페이지로 이동한다', () => {
    renderPage();

    expect(titlesOnPage()).toHaveLength(5);
    expect(
      screen.queryByText('첫 커밋 전에 하는 프로젝트 체크리스트'),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(titlesOnPage()).toHaveLength(5);

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(
      screen.getByText('첫 커밋 전에 하는 프로젝트 체크리스트'),
    ).toBeInTheDocument();
    expect(titlesOnPage()).toHaveLength(2);
  });

  it('안볼래요는 확인 대화상자를 거쳐 카드를 제거한다', async () => {
    renderPage();

    fireEvent.click(screen.getAllByRole('button', { name: '안볼래요' })[0]);

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
    expect(screen.getByText('남은 영상 11개')).toBeInTheDocument();
    expect(screen.getByText('청소 대상 6개')).toBeInTheDocument();
  });

  it('확인 대화상자를 취소하면 카드를 유지한다', () => {
    renderPage();

    fireEvent.click(screen.getAllByRole('button', { name: '안볼래요' })[0]);
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

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    expect(screen.getByText('D-07')).toBeInTheDocument();
    expect(screen.getByText('저장 일자를 초기화했습니다.')).toBeInTheDocument();
  });

  it('현재 동기화 상태를 보여주고 재시도는 실패일 때만 제공한다', () => {
    renderPage();

    expect(screen.getByText('동기화 완료')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '동기화 재시도' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('정리 액션 응답')).not.toBeInTheDocument();
  });

  it('동기화 실패 상태에서만 재시도할 수 있다', async () => {
    render(
      <MemoryRouter>
        <VideoListPage initialSyncState="failed" />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('유튜브와 통신하지 못해 동기화가 중단되었습니다.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '동기화 재시도' }));

    expect(screen.getByText('동기화 중')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '동기화 재시도' }),
    ).not.toBeInTheDocument();

    await flushActions();

    expect(screen.getByText('동기화 완료')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '동기화 재시도' }),
    ).not.toBeInTheDocument();
  });
});
