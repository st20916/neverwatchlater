import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const { default: PlaylistSetupPage } = await import('./PlaylistSetupPage');

const renderPage = () =>
  render(
    <MemoryRouter>
      <PlaylistSetupPage />
    </MemoryRouter>,
  );

describe('PlaylistSetupPage', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('로그인 확인과 재생목록 설정이 모두 성공하면 완료 화면을 보여준다', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { email: 'user@example.com', name: '홍길동', googleId: 'g-1' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ playlistId: 'PL123', created: true }),
      });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText('‘Neverwatchlater’ 재생목록이 동기화 대상으로 지정되었습니다. (새로 생성됨)'),
      ).toBeInTheDocument();
    });

    expect(screen.getByText('연결된 계정: user@example.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '정리 목록으로 이동' })).toBeInTheDocument();
  });

  it('로그인 세션이 없으면 로그인 확인 다이얼로그를 보여준다', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '로그인이 필요합니다.' }),
    });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText('로그인이 필요합니다. 로그인 하시겠습니까?'),
      ).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: '예' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '아니오' })).toBeInTheDocument();
  });

  it('로그인 확인 다이얼로그에서 "예"를 누르면 Google 로그인 페이지로 이동한다', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '로그인이 필요합니다.' }),
    });

    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };

    renderPage();

    const confirmButton = await screen.findByRole('button', { name: '예' });
    fireEvent.click(confirmButton);

    expect(window.location.href).toContain('/api/auth/google');

    window.location = originalLocation;
  });

  it('로그인 확인 다이얼로그에서 "아니오"를 누르면 메인 화면으로 이동한다', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '로그인이 필요합니다.' }),
    });

    renderPage();

    const cancelButton = await screen.findByRole('button', { name: '아니오' });
    fireEvent.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('유튜브 권한(scope)이 없으면(insufficient_scope) 재시도 버튼 대신 로그인 확인 다이얼로그를 보여준다', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { email: 'user@example.com', name: '홍길동', googleId: 'g-1' },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          message: '유튜브 재생목록 접근 권한이 없습니다. 로그아웃 후 다시 로그인해 권한 동의를 갱신해주세요.',
          reason: 'insufficient_scope',
        }),
      });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText('로그인이 필요합니다. 로그인 하시겠습니까?'),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole('button', { name: '재생목록 설정 재시도' }),
    ).not.toBeInTheDocument();
  });

  it('YouTube 채널이 없으면(no_channel) 채널 생성 확인 다이얼로그를 보여준다', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { email: 'user@example.com', name: '홍길동', googleId: 'g-1' },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          message: 'YouTube 채널이 없어 재생목록을 만들 수 없습니다. 채널을 먼저 만든 뒤 다시 시도해주세요.',
          reason: 'no_channel',
        }),
      });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText('YouTube 채널이 없습니다. 채널을 만드시겠습니까?'),
      ).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: '예' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '아니오' })).toBeInTheDocument();
  });

  it('채널 생성 다이얼로그에서 "예"를 누르면 YouTube 채널 생성 페이지를 새 탭으로 열고, 이후 재시도 버튼을 보여준다', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { email: 'user@example.com', name: '홍길동', googleId: 'g-1' },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          message: 'YouTube 채널이 없어 재생목록을 만들 수 없습니다. 채널을 먼저 만든 뒤 다시 시도해주세요.',
          reason: 'no_channel',
        }),
      });

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {});

    renderPage();

    const confirmButton = await screen.findByRole('button', { name: '예' });
    fireEvent.click(confirmButton);

    expect(openSpy).toHaveBeenCalledWith(
      'https://www.youtube.com/create_channel',
      '_blank',
      'noopener,noreferrer',
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: '채널 생성 후 재생목록 설정 재시도' }),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByText('YouTube 채널이 없습니다. 채널을 만드시겠습니까?'),
    ).not.toBeInTheDocument();
  });

  it('채널 생성 다이얼로그에서 "아니오"를 누르면 메인 화면으로 이동한다', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { email: 'user@example.com', name: '홍길동', googleId: 'g-1' },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          message: 'YouTube 채널이 없어 재생목록을 만들 수 없습니다. 채널을 먼저 만든 뒤 다시 시도해주세요.',
          reason: 'no_channel',
        }),
      });

    renderPage();

    const cancelButton = await screen.findByRole('button', { name: '아니오' });
    fireEvent.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
