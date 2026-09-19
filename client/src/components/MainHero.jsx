import useTypewriter from '../hooks/useTypewriter.js';
import boxArt from '../assets/hero-box.png';

import './MainHero.css';

const TITLE = 'Neverwatchlater';

const MainHero = () => {
  const displayedTitle = useTypewriter(TITLE);

  return (
    <section className="nwl-hero" aria-label="메인페이지">
      <div className="nwl-hero-main">
        <h1 className="nwl-title" aria-label={TITLE}>
          {displayedTitle}
          <span className="nwl-caret" aria-hidden="true" />
        </h1>
        <p className="nwl-intro-copy">
          Clear your saved list.
          <br />
          Keep only core insights.
        </p>
        <img className="nwl-box-image" src={boxArt} alt="문서가 담긴 상자" />
      </div>

      <p className="nwl-hero-footer">
        <span>FOR THE UNFINISHED THOUGHTS</span>
        <span className="nwl-hero-footer-line" aria-hidden="true" />
        <a href="#intro">SCROLL / REMEMBER</a>
      </p>
    </section>
  );
};

export default MainHero;
