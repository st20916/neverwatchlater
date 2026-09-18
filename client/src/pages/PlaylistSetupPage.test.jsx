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
    expect(screen.getByText('재생목록을 만드는 중입니다')).toBeInTheDocument();
    expect(screen.getByText('잠시만 기다려 주세요.')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: '정리 목록으로 이동' }),
    ).not.toBeInTheDocument();
  });

  it('설정 성공 상태에서 정리 목록으로 이동한다', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '설정 성공' }));

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: '전용 재생목록 설정을 완료했습니다.',
      }),
    ).toBeInTheDocument();
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
      screen.getByRole('heading', {
        level: 1,
        name: '재생목록을 만들지 못했습니다.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /전용 재생목록을 만들거나 동기화 대상으로 지정하는 데 문제가 생겼습니다/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/아래 재시도로 설정을 다시 진행해 주세요/),
    ).toBeInTheDocument();
    expect(
      screen.getByText('재생목록 생성 또는 지정에 실패했습니다.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '재생목록 설정 재시도' }));

    expect(screen.getByText('재생목록을 만드는 중입니다')).toBeInTheDocument();
    expect(screen.getByText('잠시만 기다려 주세요.')).toBeInTheDocument();
  });

  it('계정 연결 실패 상태에서 원인과 재로그인 버튼을 보여준다', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '계정 연결 실패' }));

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Google 계정 연결에 실패했습니다',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('SETUP / ACCOUNT')).toBeInTheDocument();
    expect(
      screen.getByText('Google 계정 연결').closest('li'),
    ).toHaveClass('playlist-setup__step--failed');
    expect(
      screen.getByText('Google 계정을 연결하지 못했습니다'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '다시 로그인 시도' }),
    ).toHaveAttribute('href', '/auth/loading');
  });

  it('연동 진행 중 상태에서 계정 연결 단계와 확인 안내를 보여준다', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: '연동 진행 중' }));

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Google 계정을 연동하고 있습니다',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('SETUP / ACCOUNT')).toBeInTheDocument();
    expect(
      screen.getByText('Google 계정 연결').closest('li'),
    ).toHaveClass('playlist-setup__step--current');
    expect(
      screen.getByText('Google 계정 정보를 확인하고 있습니다'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('권한 승인이 끝나면 자동으로 다음 단계로 넘어갑니다.'),
    ).toBeInTheDocument();
  });
});
