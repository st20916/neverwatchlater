import './VideoListPagination.css';

const VideoListPagination = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav className="video-pagination" aria-label="영상 목록 페이지">
      <button
        type="button"
        className="video-pagination__control"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        이전
      </button>

      <ol className="video-pagination__pages">
        {pages.map((pageNumber) => (
          <li key={pageNumber}>
            <button
              type="button"
              className={
                pageNumber === page
                  ? 'video-pagination__page video-pagination__page--current'
                  : 'video-pagination__page'
              }
              aria-current={pageNumber === page ? 'page' : undefined}
              aria-label={`${pageNumber}페이지`}
              onClick={() => onPageChange(pageNumber)}
            >
              {pageNumber}
            </button>
          </li>
        ))}
      </ol>

      <button
        type="button"
        className="video-pagination__control"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        다음
      </button>
    </nav>
  );
};

export default VideoListPagination;
