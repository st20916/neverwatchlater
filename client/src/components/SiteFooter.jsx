import { useRef } from 'react';

import useSectionReveal from '../hooks/useSectionReveal.js';

import './SiteFooter.css';

const TEAM = [
  { role: 'PO / Front.', name: 'Hyoju Kwon' },
  { role: 'Front.', name: 'Min hae' },
  { role: 'SM / Back.', name: 'Jeongjae Lee' },
  { role: 'Back.', name: 'Gihyeon Nam' },
];

const SiteFooter = () => {
  const rootRef = useRef(null);
  useSectionReveal(rootRef);

  return (
  <footer className="nwl-footer nwl-reveal-section" ref={rootRef}>
    <div className="nwl-footer-inner">
      <p className="nwl-footer-tagline">
        Built with passion by Team Neverwatchlater
      </p>
      <ul className="nwl-footer-credits">
        {TEAM.map((member) => (
          <li key={member.name}>
            <span className="nwl-footer-role">{member.role}</span>
            <span className="nwl-footer-name">{member.name}</span>
          </li>
        ))}
      </ul>
      <p className="nwl-footer-legal">
        2026 Neverwatchlater Team. Designed &amp; Developed with Care.
      </p>
    </div>
  </footer>
  );
};

export default SiteFooter;
