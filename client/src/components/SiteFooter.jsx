import './SiteFooter.css';

const FOOTER_COLUMNS = [
  {
    heading: '서비스',
    links: ['정리 목록', '재생목록 설정'],
  },
  {
    heading: '정리 액션',
    links: ['바로 보기', '나중에', '보관하기', '안볼래요'],
  },
  {
    heading: '도움말',
    links: ['전용 재생목록 안내', '요약 불가 영상', '동기화 주기'],
  },
];

const SiteFooter = () => (
  <footer className="site-footer">
    <div className="site-footer__inner">
      <div className="site-footer__columns">
        {FOOTER_COLUMNS.map((column) => (
          <div key={column.heading} className="site-footer__column">
            <p className="type-caption-strong site-footer__heading">
              {column.heading}
            </p>
            <ul>
              {column.links.map((link) => (
                <li key={link} className="type-dense-link">
                  <a href="/" className="site-footer__link">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="type-fine-print site-footer__legal">
        Neverwatchlater 프로토타입. 화면 구성 확인용이며 실제 유튜브 계정과
        연동되지 않습니다.
      </p>
      <p className="type-micro-legal site-footer__legal">
        기본 ‘나중에 볼 동영상’ 재생목록은 조회하거나 수정하지 않습니다.
      </p>
    </div>
  </footer>
);

export default SiteFooter;
