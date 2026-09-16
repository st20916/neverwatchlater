import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import MainHero from '../components/MainHero.jsx';
import ServiceIntro from '../components/ServiceIntro.jsx';

import './LandingPage.css';

const LandingPage = () => {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      return;
    }

    document.getElementById(hash.replace('#', ''))?.scrollIntoView();
  }, [hash]);

  return (
    <div className="nwl-page">
      <div className="nwl-grain" aria-hidden="true" />
      <MainHero />
      <ServiceIntro />
    </div>
  );
};

export default LandingPage;
