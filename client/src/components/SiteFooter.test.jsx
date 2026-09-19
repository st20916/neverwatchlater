import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SiteFooter from './SiteFooter';

describe('SiteFooter', () => {
  it('팀 크레딧과 푸터 카피를 보여준다', () => {
    render(<SiteFooter />);

    expect(
      screen.getByText('Built with passion by Team Neverwatchlater'),
    ).toBeInTheDocument();
    expect(screen.getByText('PO / Front.')).toBeInTheDocument();
    expect(screen.getByText('Hyoju Kwon')).toBeInTheDocument();
    expect(screen.getByText('Front.')).toBeInTheDocument();
    expect(screen.getByText('Min hae')).toBeInTheDocument();
    expect(screen.getByText('SM / Back.')).toBeInTheDocument();
    expect(screen.getByText('Jeongjae Lee')).toBeInTheDocument();
    expect(screen.getByText('Back.')).toBeInTheDocument();
    expect(screen.getByText('Gihyeon Nam')).toBeInTheDocument();

    const names = screen
      .getAllByRole('listitem')
      .map((item) => item.querySelector('.nwl-footer-name')?.textContent);
    expect(names).toEqual([
      'Hyoju Kwon',
      'Min hae',
      'Jeongjae Lee',
      'Gihyeon Nam',
    ]);
    expect(
      screen.getByText(
        '2026 Neverwatchlater Team. Designed & Developed with Care.',
      ),
    ).toBeInTheDocument();
  });
});
