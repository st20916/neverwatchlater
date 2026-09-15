import { Link } from 'react-router-dom';

import './LandingPage.css';

const ArrowUpRight = ({ size = 19 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M7 7h10v10" />
    <path d="M7 17 17 7" />
  </svg>
);

const LandingPage = () => (
  <div className="success-page guide-page">
    <div className="top-rule" aria-hidden="true" />
    <div className="paper-orbit paper-orbit-one" aria-hidden="true" />
    <div className="paper-orbit paper-orbit-two" aria-hidden="true" />

    <header className="site-header guide-header guide-nav">
      <nav className="guide-nav-left" aria-label="서비스 메뉴">
        <Link to="/" className="guide-nav-wordmark" aria-label="neverwatchlater 홈">
          neverwatchlater
        </Link>
        <Link to="/">서비스 소개</Link>
        <Link to="/videos">정리 목록</Link>
        <Link to="/playlist-setup">재생 목록 설정</Link>
      </nav>
      <Link to="/auth/loading" className="guide-login-link">
        로그인
      </Link>
    </header>

    <section className="guide-hero" aria-labelledby="guide-title">
      <div className="guide-hero-copy">
        <p className="eyebrow">PERSONAL ARCHIVE / GUIDE</p>
        <div className="guide-intro-block">
          <span className="guide-intro-number">00 / 01</span>
          <h1 id="guide-title">
            나중에
            <br />
            <em>보긴 뭘 봐.</em>
          </h1>
          <p className="guide-lead">
            서비스를 시작하면 저장한 영상이 한곳에 모이고,
            <br />
            다시 볼지 놓아줄지 천천히 결정할 수 있어요.
          </p>
        </div>
        <Link to="/auth/loading" className="guide-cta guide-cta-prominent">
          <strong>Google 계정으로 시작하기</strong>
          <ArrowUpRight size={19} />
        </Link>
        <p className="guide-cta-note">
          무료로 시작 · 기본 ‘나중에 볼 동영상’ 목록은 건드리지 않아요.
        </p>
      </div>

      <div className="guide-index-card">
        <div className="panel-index">
          <span>READ ME / 001</span>
          <span>TAKE YOUR TIME</span>
        </div>
        <div className="guide-scribble">
          <span>save</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="21"
            height="21"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 5v14" />
            <path d="m19 12-7 7-7-7" />
          </svg>
        </div>
        <div className="guide-card-copy">
          <p className="guide-card-kicker">THE SIMPLE PROMISE</p>
          <p>
            저장한 영상이
            <br />
            <em>사라지지 않게.</em>
          </p>
        </div>
        <div className="guide-card-footer">
          <span>NO MORE LOST TABS</span>
          <span className="footer-arrow">
            <ArrowUpRight size={13} />
          </span>
        </div>
      </div>
    </section>

    <section className="guide-sync-section" aria-labelledby="sync-title">
      <div className="section-marker">
        <span>01</span>
        <span>자동으로 모으기</span>
      </div>
      <div className="sync-content">
        <div>
          <p className="guide-kicker">SAVE ONCE / SEE IT HERE</p>
          <h2 id="sync-title">
            저장만 해도,
            <br />
            <em>목록이 보여요.</em>
          </h2>
        </div>
        <p className="sync-description">
          YouTube에서 Neverwatchlater 전용 재생목록에 영상을 저장하면 서비스가
          최대 3일 주기로 자동 반영해요. 링크를 하나씩 복사해 붙여넣을 필요가
          없어요.
        </p>
      </div>
      <div className="sync-flow">
        <div className="flow-step">
          <span className="flow-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 12H3" />
              <path d="M16 6H3" />
              <path d="M12 18H3" />
              <path d="m16 12 5 3-5 3v-6Z" />
            </svg>
          </span>
          <strong>YouTube에 저장</strong>
          <small>전용 재생목록에 담기</small>
        </div>
        <div className="flow-line" />
        <div className="flow-step">
          <span className="flow-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" />
              <path d="M16 2v4" />
              <path d="M8 2v4" />
              <path d="M3 10h5" />
              <path d="M17.5 17.5 16 16.3V14" />
              <circle cx="16" cy="16" r="6" />
            </svg>
          </span>
          <strong>최대 3일 주기</strong>
          <small>자동으로 목록 반영</small>
        </div>
        <div className="flow-line" />
        <div className="flow-step">
          <span className="flow-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="19"
              height="19"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
              <path d="M20 3v4" />
              <path d="M22 5h-4" />
              <path d="M4 17v2" />
              <path d="M5 18H3" />
            </svg>
          </span>
          <strong>요약 카드 확인</strong>
          <small>핵심만 빠르게 읽기</small>
        </div>
      </div>
    </section>

    <section className="guide-card-section" aria-labelledby="card-title">
      <div className="section-marker">
        <span>02</span>
        <span>한 장으로 판단하기</span>
      </div>
      <div className="card-section-heading">
        <div>
          <p className="guide-kicker">ONE CARD / EVERYTHING YOU NEED</p>
          <h2 id="card-title">
            영상의 핵심을
            <br />
            <em>한눈에.</em>
          </h2>
        </div>
        <p>
          썸네일, 제목, 채널, 저장 경과일과
          <br />
          자막 기반 AI 3줄 요약을 함께 보여줘요.
        </p>
      </div>
      <div className="demo-card">
        <div className="demo-thumb">
          <div className="thumb-play">▶</div>
          <span className="thumb-label">YOUTUBE / 16:42</span>
        </div>
        <div className="demo-meta">
          <p className="demo-channel">STUDY ARCHIVE · 저장한 지 08일</p>
          <h3>일의 본질을 다시 생각하는 시간</h3>
          <div className="demo-summary">
            <span className="summary-label">AI SUMMARY / 3 LINES</span>
            <p>
              • 바쁘게 움직이는 것과 중요한 일을 하는 것은 다르다.
              <br />
              • 집중을 위해서는 덜어내는 선택이 필요하다.
              <br />
              • 오늘의 작은 결정이 내일의 시간을 만든다.
            </p>
          </div>
          <div className="demo-actions" aria-hidden="true">
            <span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 3h6v6" />
                <path d="M10 14 21 3" />
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              </svg>
              바로 보기
            </span>
            <span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16.5 12" />
              </svg>
              나중에
            </span>
            <span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <line x1="10" x2="10" y1="11" y2="17" />
                <line x1="14" x2="14" y1="11" y2="17" />
              </svg>
              안볼래요
            </span>
            <span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="20" height="5" x="2" y="3" rx="1" />
                <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
                <path d="M10 12h4" />
              </svg>
              보관하기
            </span>
          </div>
        </div>
        <div className="demo-warning">
          <span>D+01</span>
          <small>청소 대상</small>
        </div>
      </div>
    </section>

    <section className="guide-actions-section" aria-labelledby="actions-title">
      <div className="section-marker">
        <span>03</span>
        <span>내 방식으로 정리하기</span>
      </div>
      <div className="card-section-heading">
        <div>
          <p className="guide-kicker">FOUR SMALL DECISIONS</p>
          <h2 id="actions-title">
            보고, 미루고,
            <br />
            <em>놓아주기.</em>
          </h2>
        </div>
        <p>
          카드 하나마다 지금의 마음에 맞는
          <br />
          정리 방법을 고를 수 있어요.
        </p>
      </div>
      <div className="action-grid">
        <article className="guide-action-card red">
          <div className="action-top">
            <span>01</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 3h6v6" />
              <path d="M10 14 21 3" />
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            </svg>
          </div>
          <p className="action-english">WATCH & CLEAN</p>
          <h3>바로 보기</h3>
          <p>
            YouTube를 새 탭으로 열고, 전용 재생목록과 서비스 목록에서 영상을
            정리해요.
          </p>
          <span className="action-arrow">
            <ArrowUpRight size={15} />
          </span>
        </article>
        <article className="guide-action-card teal">
          <div className="action-top">
            <span>02</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16.5 12" />
            </svg>
          </div>
          <p className="action-english">RESET THE CLOCK</p>
          <h3>나중에</h3>
          <p>
            목록에는 그대로 두고 저장 기준일만 오늘로 되돌려요. 방치 경고도
            사라져요.
          </p>
          <span className="action-arrow">
            <ArrowUpRight size={15} />
          </span>
        </article>
        <article className="guide-action-card red">
          <div className="action-top">
            <span>03</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" x2="10" y1="11" y2="17" />
              <line x1="14" x2="14" y1="11" y2="17" />
            </svg>
          </div>
          <p className="action-english">LET IT GO</p>
          <h3>안볼래요</h3>
          <p>
            확인 후 전용 재생목록과 서비스 목록에서 삭제하고 청소 완료 수를
            올려요.
          </p>
          <span className="action-arrow">
            <ArrowUpRight size={15} />
          </span>
        </article>
        <article className="guide-action-card teal">
          <div className="action-top">
            <span>04</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect width="20" height="5" x="2" y="3" rx="1" />
              <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
              <path d="M10 12h4" />
            </svg>
          </div>
          <p className="action-english">KEEP, QUIETLY</p>
          <h3>보관하기</h3>
          <p>
            영상은 남겨두고 D-Day 방치 경고만 멈춰요. 나중에 다시 꺼내볼 수
            있어요.
          </p>
          <span className="action-arrow">
            <ArrowUpRight size={15} />
          </span>
        </article>
      </div>
    </section>

    <section className="guide-dday-band">
      <div>
        <p className="guide-kicker">AFTER 7 DAYS</p>
        <h2>
          방치된 영상은
          <br />
          <em>조용히 알려줄게요.</em>
        </h2>
      </div>
      <div className="dday-copy">
        <span className="big-dday">D+07</span>
        <p>
          저장 후 7일이 지나면 카드에 청소 대상 경고가 나타나요. 자동으로
          지우지 않으니, 마지막 선택은 언제나 당신의 몫이에요.
        </p>
      </div>
    </section>

    <footer className="site-footer guide-footer">
      <span>끝나지 않은 생각들을 위해</span>
      <span className="footer-line" />
      <span>사용 설명서 / 기억하기</span>
    </footer>
  </div>
);

export default LandingPage;
