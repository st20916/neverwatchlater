// 서버(server/) API의 베이스 URL. 배포 환경에 맞게 VITE_API_BASE_URL로 오버라이드할 수 있다.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
