import './StatusNotice.css';

/**
 * 동기화/설정 진행·실패 상태를 카드 목록 위에 인라인으로 표시하는 안내 영역.
 * design.md에 전용 스펙이 없어 store-utility-card grammar를 그대로 재사용한다.
 */
const StatusNotice = ({ label, title, description, actionLabel, onAction }) => (
  <section className="status-notice utility-card">
    <div className="status-notice__text">
      {label ? (
        <span className="badge badge--neutral status-notice__label">
          {label}
        </span>
      ) : null}
      <p className="type-body-strong status-notice__title">{title}</p>
      {description ? (
        <p className="type-caption status-notice__description">{description}</p>
      ) : null}
    </div>

    {actionLabel ? (
      <button type="button" className="btn-pearl-capsule" onClick={onAction}>
        {actionLabel}
      </button>
    ) : null}
  </section>
);

export default StatusNotice;
