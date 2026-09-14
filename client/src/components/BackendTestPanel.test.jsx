import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BackendTestPanel from './BackendTestPanel';

describe('BackendTestPanel', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('헬스체크 버튼을 클릭하면 GET /api/health를 호출하고 결과를 표시한다', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'ok', uptime: 12.3, timestamp: '2026-09-14T00:00:00.000Z' }),
    });

    render(<BackendTestPanel />);

    fireEvent.click(screen.getByRole('button', { name: /헬스체크/ }));

    await waitFor(() => {
      expect(screen.getByText(/"status": "ok"/)).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/health'));
  });

  it('요청이 실패하면 오류 메시지를 표시한다', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '로그인이 필요합니다.' }),
    });

    render(<BackendTestPanel />);

    fireEvent.click(screen.getByRole('button', { name: /내 정보 확인/ }));

    await waitFor(() => {
      expect(screen.getByText(/오류: 로그인이 필요합니다\./)).toBeInTheDocument();
    });
  });

  it('Google 로그인 버튼은 fetch 대신 전체 페이지 이동을 수행한다', () => {
    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };

    render(<BackendTestPanel />);

    fireEvent.click(screen.getByRole('button', { name: /Google 로그인 시작/ }));

    expect(window.location.href).toContain('/api/auth/google');
    expect(global.fetch).not.toHaveBeenCalled();

    window.location = originalLocation;
  });
});
