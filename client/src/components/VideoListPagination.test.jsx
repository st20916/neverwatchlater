import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import VideoListPagination from './VideoListPagination.jsx';

describe('VideoListPagination', () => {
  it('페이지가 하나면 페이지네이션을 숨긴다', () => {
    const { container } = render(
      <VideoListPagination page={1} totalPages={1} onPageChange={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('다음 페이지 버튼을 누르면 페이지를 바꾼다', () => {
    const onPageChange = vi.fn();

    render(
      <VideoListPagination
        page={1}
        totalPages={3}
        onPageChange={onPageChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '다음' }));

    expect(onPageChange).toHaveBeenCalledWith(2);
    expect(screen.getByRole('button', { name: '1페이지' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
