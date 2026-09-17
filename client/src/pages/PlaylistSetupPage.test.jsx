import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import PlaylistSetupPage from './PlaylistSetupPage.jsx';

const renderPage = () =>
  render(
    <MemoryRouter>
      <PlaylistSetupPage />
    </MemoryRouter>,
  );

describe('PlaylistSetupPage', () => {
  it('설정 단계를 보여주고 진행 상태를 안내한다', () => {
    renderPage();

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: '전용 재생목록을 설정하고 있습니다',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Google 계정 연결')).toBeInTheDocument();
    expect(
      screen.getByText('‘Neverwatchlater’ 전용 재생목록 생성'),
    ).toBeInTheDocument();
    expect(screen.getByText('동기화 대상 지정')).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: '설정 진행 단계' }),
    ).toBeInTheDocument();
    expect(screen.getByText('설정 완료')).toBeInTheDocument();
    expect(
      screen.getByText('재생목록을 만드는 중입니다… 잠시만 기다려 주세요.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: '정리 목록으로 이동' }),
    ).not.toBeInTheDocument();
  });

  it('설정 성공 상태에서 정리 목록으로 이동한다', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '설정 성공' }));

    expect(
      screen.getByText(
        '‘Neverwatchlater’ 재생목록이 동기화 대상으로 지정되었습니다.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '정리 목록으로 이동' })).toHaveAttribute(
      'href',
      '/videos',
    );
  });

  it('설정 실패 후 재시도하면 진행 중 상태로 돌아간다', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '설정 실패' }));

    expect(
      screen.getByText('재생목록 생성 또는 지정에 실패했습니다.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '재생목록 설정 재시도' }));

    expect(
      screen.getByText('재생목록을 만드는 중입니다… 잠시만 기다려 주세요.'),
    ).toBeInTheDocument();
  });
});
