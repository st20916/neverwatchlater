import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchCurrentUser } from '../api/authApi';
import useCurrentUser from './useCurrentUser';

vi.mock('../api/authApi', () => ({
  fetchCurrentUser: vi.fn(),
}));

describe('useCurrentUser', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('로그인된 사용자를 반환한다', async () => {
    fetchCurrentUser.mockResolvedValueOnce({
      user: { name: '효주', picture: 'https://example.com/photo.png' },
    });

    const { result } = renderHook(() => useCurrentUser());

    await waitFor(() => {
      expect(result.current).toEqual({
        name: '효주',
        picture: 'https://example.com/photo.png',
      });
    });
  });

  it('세션이 없으면 null을 유지한다', async () => {
    fetchCurrentUser.mockRejectedValueOnce(new Error('로그인이 필요합니다.'));

    const { result } = renderHook(() => useCurrentUser());

    await waitFor(() => {
      expect(fetchCurrentUser).toHaveBeenCalledTimes(1);
    });

    expect(result.current).toBeNull();
  });
});
