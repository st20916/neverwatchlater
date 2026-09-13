import { Link } from 'react-router-dom';

import MediaPlaceholder from '../components/MediaPlaceholder.jsx';

import './LandingPage.css';

const FEATURE_TILES = [
  {
    id: 'sync',
    surface: 'tile--dark',
    title: '저장만 해도 목록이 정리됩니다',
    tagline:
      '유튜브에서 전용 재생목록에 저장하면 최대 3일 주기로 서비스에 자동 반영됩니다.',
    mediaLabel: '재생목록 동기화 이미지 영역',
  },
  {
    id: 'summary',
    surface: 'tile--light',
    title: 'AI 3줄 요약',
    tagline: '자막을 기반으로 핵심만 세 줄로 먼저 확인하세요.',
    mediaLabel: 'AI 요약 카드 이미지 영역',
  },
  {
    id: 'dday',
    surface: 'tile--dark-2',
    title: '7일이 지나면 청소 대상',
    tagline: '방치된 영상은 D-Day 경고로 표시해 정리 시점을 알려 줍니다.',
    mediaLabel: 'D-Day 경고 이미지 영역',
  },
];

const LandingPage = () => (
  <>
    <section className="tile tile--light landing-hero">
      <div className="tile__inner tile__inner--centered">
        <h1 className="type-hero-display landing-hero__title">
          Neverwatchlater
        </h1>
        <p className="type-lead landing-hero__tagline">
          저장만 하고 다시 보지 않는 유튜브 영상을 AI 3줄 요약과 D-Day로 정리합니다.
        </p>
        <div className="tile__actions">
          <Link to="/auth/loading" className="btn-primary">
            Google 계정으로 시작하기
          </Link>
          <a href="#how-it-works" className="btn-secondary-pill">
            더 알아보기
          </a>
        </div>
        <div className="landing-hero__media">
          <MediaPlaceholder
            label="서비스 대표 이미지 영역"
            ratio="21/9"
            radius="none"
            elevated
          />
        </div>
      </div>
    </section>

    <div id="how-it-works">
      {FEATURE_TILES.map((tile) => (
        <section key={tile.id} className={`tile ${tile.surface}`}>
          <div className="tile__inner tile__inner--centered">
            <h2 className="type-display-lg">{tile.title}</h2>
            <p className="type-lead landing-tile__tagline">{tile.tagline}</p>
            <div className="landing-tile__media">
              <MediaPlaceholder
                label={tile.mediaLabel}
                ratio="16/9"
                radius="sm"
                elevated
              />
            </div>
          </div>
        </section>
      ))}
    </div>

    <section className="tile tile--parchment">
      <div className="tile__inner tile__inner--reading tile__inner--centered">
        <h2 className="type-display-md">전용 재생목록만 사용합니다</h2>
        <p className="type-lead-airy landing-note">
          기본 ‘나중에 볼 동영상’ 재생목록은 조회하거나 수정하지 않습니다. 연결
          후 ‘Neverwatchlater’ 전용 재생목록을 만들고 그 목록만 동기화합니다.
        </p>
        <Link to="/auth/loading" className="btn-store-hero">
          지금 연결하기
        </Link>
      </div>
    </section>
  </>
);

export default LandingPage;
