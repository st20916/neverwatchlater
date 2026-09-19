import { useRef } from "react";
import { Link } from "react-router-dom";

import useSectionReveal from "../hooks/useSectionReveal.js";
import ActionGrid from "./ActionGrid.jsx";
import VideoCard from "./VideoCard.jsx";

import "./ServiceIntro.css";

const DEMO_VIDEO = {
  id: "demo-insight",
  title: "일의 본질을 다시 생각하는 시간",
  channelName: "Study Archive",
  // 7일 전 저장 → D+08(정리 대상 첫날)로 표시된다.
  savedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  duration: "16:42",
  isArchived: false,
  summary: [
    "바쁘게 움직이는 것과 중요한 일을 하는 것은 다르다.",
    "집중을 위해서는 덜어내는 선택이 필요하다.",
    "오늘의 작은 결정이 내일의 시간을 만든다.",
  ],
};

const noop = () => {};

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
  useSectionReveal(rootRef, ":scope > section");

  return (
    <div className="nwl-intro" id="intro" ref={rootRef}>
      <section
        className="guide-hero nwl-reveal-section"
        aria-labelledby="guide-title"
      >
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

      <section
        className="guide-sync-section nwl-reveal-section"
        aria-labelledby="sync-title"
      >
        <div className="sync-content">
          <p className="guide-kicker">자동 동기화 시스템</p>
          <h2 id="sync-title">
            저장만 해도, <br className="guide-lead-break" />
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

      <section
        className="guide-card-section nwl-reveal-section"
        aria-labelledby="card-title"
      >
        <div className="sync-content">
          <p className="guide-kicker">AI 영상 핵심 요약</p>
          <h2 id="card-title">
            영상 재생 없이, <br className="guide-lead-break" />
            핵심만 봐요.
          </h2>
          <p className="sync-description">
            썸네일, 제목, 채널, 저장 경과일과 자막 기반 AI 3줄 요약을 함께
            보여줘요.
          </p>
        </div>
        <div className="demo-stage">
          <VideoCard
            video={DEMO_VIDEO}
            onWatch={noop}
            onLater={noop}
            onArchive={noop}
            onDelete={noop}
          />
        </div>
      </section>

      <section
        className="guide-actions-section nwl-reveal-section"
        aria-labelledby="actions-title"
      >
        <div className="sync-content">
          <p className="guide-kicker">간편한 정리 방법</p>
          <h2 id="actions-title">
            보고, 미루고, <br className="guide-lead-break" />
            놓아주기.
          </h2>
          <p className="sync-description">
            복잡하게 고민할 필요 없이, 버튼 한 번이면 끝나요. 클릭 한 번으로
            재생목록을 가볍게 비워보세요.
          </p>
        </div>
        <ActionGrid />
      </section>
    </div>
  );
};

export default ServiceIntro;
