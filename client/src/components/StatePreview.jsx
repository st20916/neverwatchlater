import './StatePreview.css';

/**
 * 프로토타입 전용 컨트롤. 한 화면이 가지는 여러 상태(진행·성공·실패 등)를
 * 실제 API 없이 확인할 수 있도록 configurator-option-chip grammar를 재사용한다.
 */
const StatePreview = ({ label = '화면 상태', options, value, onChange }) => (
  <div className="state-preview">
    <span className="type-caption-strong state-preview__label">{label}</span>
    <div className="state-preview__options" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={
            option.value === value
              ? 'option-chip option-chip--selected'
              : 'option-chip'
          }
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);

export default StatePreview;
