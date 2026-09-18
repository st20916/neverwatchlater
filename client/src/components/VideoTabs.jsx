import './VideoTabs.css';

/**
 * 정리 목록의 전체/정리 대상/보관 탭. 각 탭 라벨 옆에 해당 탭의 영상 개수를 표시한다.
 * @param {{ tabs: Array<{ id: string, label: string, count: number }>, activeTab: string, onChange: (id: string) => void }} props
 */
const VideoTabs = ({ tabs, activeTab, onChange }) => (
  <nav className="video-tabs" aria-label="목록 필터">
    {tabs.map((tab) => (
      <button
        key={tab.id}
        type="button"
        className={
          tab.id === activeTab ? 'video-tabs__tab video-tabs__tab--active' : 'video-tabs__tab'
        }
        aria-current={tab.id === activeTab ? 'true' : undefined}
        onClick={() => onChange(tab.id)}
      >
        <span>{tab.label}</span>{' '}
        <span className="video-tabs__count">{tab.count}</span>
      </button>
    ))}
  </nav>
);

export default VideoTabs;
