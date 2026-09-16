/**
 * 초 단위 길이를 "분:초"(1시간 이상이면 "시:분:초")로 변환한다.
 * 길이 정보가 없는 영상(라이브 방송 등)은 null을 그대로 반환한다.
 */
export const formatDuration = (totalSeconds) => {
  if (totalSeconds == null) return null;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const paddedSeconds = String(seconds).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${paddedSeconds}`;
  }

  return `${minutes}:${paddedSeconds}`;
};
