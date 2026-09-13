import './ConfirmDialog.css';

const ConfirmDialog = ({
  title,
  description,
  confirmLabel = '삭제',
  cancelLabel = '취소',
  onConfirm,
  onCancel,
}) => (
  <div className="confirm-dialog__backdrop">
    <div
      className="confirm-dialog utility-card"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <h2 className="type-tagline confirm-dialog__title">{title}</h2>
      <p className="type-body confirm-dialog__description">{description}</p>
      <div className="confirm-dialog__actions">
        <button type="button" className="btn-pearl-capsule" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className="btn-primary" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export default ConfirmDialog;
