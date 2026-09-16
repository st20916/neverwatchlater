import { useRef } from 'react';
import { Link } from 'react-router-dom';

import useSectionReveal from '../hooks/useSectionReveal.js';

import './ServiceIntro.css';

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

const ServiceIntro = () => {
  const rootRef = useRef(null);
  useSectionReveal(rootRef, ':scope > section');

  return (
  <div className="nwl-intro" id="intro" ref={rootRef}>
    <section className="guide-hero nwl-reveal-section" aria-labelledby="guide-title">
      <div className="guide-hero-copy">
        <p className="eyebrow">연동 및 재생목록 생성</p>
        <h2 id="guide-title">쌓여만 가는 재생목록 영상들</h2>
        <p className="guide-lead-detail">
          나중에 보긴 뭘 봐?
          <br className="guide-lead-break" />
          지금 빠르게 정리할 수 있어요!
          <br />
          Google 계정을 연결하고 전용 재생목록을 만들면 끝. 평소처럼 유튜브에
          저장만 하면 돼요.
        </p>
        <Link to="/auth/loading" className="guide-cta guide-cta-prominent">
          <strong>Google 계정으로 시작하기</strong>
          <ArrowUpRight size={19} />
        </Link>
      </div>
    </section>

    <section className="guide-sync-section nwl-reveal-section" aria-labelledby="sync-title">
      <div className="sync-content">
        <p className="guide-kicker">자동 동기화 시스템</p>
        <h2 id="sync-title">
          저장만 해도,{' '}
          <br className="guide-lead-break" />
          목록이 보여요.
        </h2>
        <p className="sync-description">
          유튜브에서 Neverwatchlater 전용 재생목록에 영상을 저장하면 서비스가
          최대 3일 주기로 자동 반영해요. 링크를 하나씩 복사해 붙여넣을 필요가
          없어요.
        </p>
      </div>
      <div className="demo-card sync-flow">
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
          <strong>AI 요약 확인</strong>
          <small>핵심만 빠르게 읽기</small>
        </div>
      </div>
    </section>

    <section className="guide-card-section nwl-reveal-section" aria-labelledby="card-title">
      <div className="sync-content">
        <p className="guide-kicker">AI 영상 핵심 요약</p>
        <h2 id="card-title">
          영상 재생 없이,{' '}
          <br className="guide-lead-break" />
          핵심만 봐요.
        </h2>
        <p className="sync-description">
          썸네일, 제목, 채널, 저장 경과일과 자막 기반 AI 3줄 요약을 함께
          보여줘요.
        </p>
      </div>
      <div className="demo-stage">
        <div className="demo-card">
          <div className="demo-thumb">
            <div className="thumb-play">▶</div>
            <span className="thumb-label">YOUTUBE / 16:42</span>
          </div>
          <div className="demo-meta">
            <p className="demo-channel">
              STUDY ARCHIVE
              <span className="demo-dday-badge">D+08</span>
            </p>
            <h3>일의 본질을 다시 생각하는 시간</h3>
            <div className="demo-summary">
              <span className="summary-label">AI 3줄 요약</span>
              <p>
                • 바쁘게 움직이는 것과 중요한 일을 하는 것은 다르다.
                <br />
                • 집중을 위해서는 덜어내는 선택이 필요하다.
                <br />
                • 오늘의 작은 결정이 내일의 시간을 만든다.
              </p>
            </div>
          </div>
        </div>
        <div className="demo-actions" aria-hidden="true">
          <span className="demo-action-watch">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M2.5 1.2v9.6L11 6 2.5 1.2Z" />
            </svg>
            바로 보기
          </span>
          <span>나중에</span>
          <span>안볼래요</span>
          <span>보관하기</span>
        </div>
      </div>
    </section>

    <section className="guide-actions-section nwl-reveal-section" aria-labelledby="actions-title">
      <div className="sync-content">
        <p className="guide-kicker">FOUR SMALL DECISIONS</p>
        <h2 id="actions-title">
          보고, 미루고,{' '}
          <br className="guide-lead-break" />
          놓아주기.
        </h2>
        <p className="sync-description">
          카드 하나마다 지금의 마음에 맞는 정리 방법을 고를 수 있어요.
        </p>
      </div>
      <div className="action-grid">
        <article className="guide-action-card guide-action-card--alert">
          <div className="action-top">
            <span>01</span>
            <ArrowUpRight size={18} />
          </div>
          <p className="action-english">WATCH & CLEAN</p>
          <h3>바로 보기</h3>
          <p>
            YouTube를 새 탭으로 열고, 전용 재생목록과 서비스 목록에서 영상을
            정리해요.
          </p>
        </article>
        <article className="guide-action-card guide-action-card--accent">
          <div className="action-top">
            <span>02</span>
            <ArrowUpRight size={18} />
          </div>
          <p className="action-english">RESET THE CLOCK</p>
          <h3>나중에</h3>
          <p>
            목록에는 그대로 두고 저장 기준일만 오늘로 되돌려요. 방치 경고도
            사라져요.
          </p>
        </article>
        <article className="guide-action-card guide-action-card--alert">
          <div className="action-top">
            <span>03</span>
            <ArrowUpRight size={18} />
          </div>
          <p className="action-english">LET IT GO</p>
          <h3>안볼래요</h3>
          <p>
            확인 후 전용 재생목록과 서비스 목록에서 삭제하고 청소 완료 수를
            올려요.
          </p>
        </article>
        <article className="guide-action-card guide-action-card--accent">
          <div className="action-top">
            <span>04</span>
            <ArrowUpRight size={18} />
          </div>
          <p className="action-english">KEEP, QUIETLY</p>
          <h3>보관하기</h3>
          <p>
            영상은 남겨두고 D-Day 방치 경고만 멈춰요. 나중에 다시 꺼내볼 수
            있어요.
          </p>
        </article>
      </div>
    </section>
  </div>
  );
};

export default ServiceIntro;
