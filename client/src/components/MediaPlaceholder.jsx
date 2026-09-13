import './MediaPlaceholder.css';

const RATIO_CLASS = {
  '21/9': 'media-placeholder--ultrawide',
  '16/9': 'media-placeholder--wide',
  '1/1': 'media-placeholder--square',
};

const RADIUS_CLASS = {
  none: 'media-placeholder--radius-none',
  sm: 'media-placeholder--radius-sm',
  lg: 'media-placeholder--radius-lg',
};

/**
 * 프로토타입 단계에서는 실제 썸네일/제품 이미지를 사용하지 않고
 * design.md의 회색 플레이스홀더(surface-chip-translucent)로만 표현한다.
 */
const MediaPlaceholder = ({
  label = '이미지 영역',
  ratio = '16/9',
  radius = 'sm',
  elevated = false,
}) => {
  const classNames = [
    'media-placeholder',
    RATIO_CLASS[ratio] ?? RATIO_CLASS['16/9'],
    RADIUS_CLASS[radius] ?? RADIUS_CLASS.sm,
    elevated ? 'media-placeholder--elevated' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} role="img" aria-label={label}>
      <span className="type-caption media-placeholder__label">{label}</span>
    </div>
  );
};

export default MediaPlaceholder;
