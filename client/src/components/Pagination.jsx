import './Pagination.css';

const PAGE_WINDOW_SIZE = 3;

/**
 * 현재 페이지를 중심으로 최대 size개의 페이지 번호를 반환한다.
 * 예: current=3, total=10 -> [2, 3, 4] / current=1 -> [1, 2, 3] / current=total -> 끝에서 size개.
 */
function getPageWindow(current, total, size = PAGE_WINDOW_SIZE) {
  if (total <= size) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  let start = current - 1;
  let end = current + 1;

  if (start < 1) {
    end += 1 - start;
    start = 1;
  } else if (end > total) {
    start -= end - total;
    end = total;
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

const Pagination = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;

  const isFirst = page === 1;
  const isLast = page === totalPages;

  return (
    <nav className="pagination" aria-label="페이지 이동">
      <button
        type="button"
        className="btn-pearl-capsule pagination__edge"
        disabled={isFirst}
        onClick={() => onChange(1)}
      >
        « 처음
      </button>
      <button
        type="button"
        className="btn-pearl-capsule pagination__step"
        disabled={isFirst}
        onClick={() => onChange(page - 1)}
      >
        이전
      </button>

      <ul className="pagination__pages">
        {getPageWindow(page, totalPages).map((p) => (
          <li key={p}>
            <button
              type="button"
              className={
                p === page
                  ? 'btn-primary pagination__page pagination__page--active'
                  : 'btn-pearl-capsule pagination__page'
              }
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onChange(p)}
            >
              {p}
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="btn-pearl-capsule pagination__step"
        disabled={isLast}
        onClick={() => onChange(page + 1)}
      >
        다음
      </button>
      <button
        type="button"
        className="btn-pearl-capsule pagination__edge"
        disabled={isLast}
        onClick={() => onChange(totalPages)}
      >
        끝 »
      </button>
    </nav>
  );
};

export default Pagination;
