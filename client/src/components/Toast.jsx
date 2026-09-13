import './Toast.css';

/**
 * PRD의 성공/오류 토스트. 색이 아닌 표면(밝은/어두운 타일)으로 톤을 구분한다.
 */
const Toast = ({ message, tone = 'success', onClose }) => {
  if (!message) {
    return null;
  }

  return (
    <div
      className={`toast toast--${tone}`}
      role="status"
      aria-live="polite"
    >
      <p className="type-caption toast__message">{message}</p>
      {onClose ? (
        <button
          type="button"
          className="toast__close type-caption"
          onClick={onClose}
        >
          닫기
        </button>
      ) : null}
    </div>
  );
};

export default Toast;
