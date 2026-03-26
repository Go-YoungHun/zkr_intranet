import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchBoardPosts } from "../lib/boards";
import type { BoardPost, BoardType } from "../lib/boards";

const BOARD_LABELS: Record<BoardType, string> = {
  notice: "공지사항",
  resource: "자료실",
};

const resolveBoardType = (value?: string): BoardType | null => {
  if (value === "notice" || value === "resource") return value;
  return null;
};

export default function BoardListPage() {
  const params = useParams();
  const boardType = useMemo(() => resolveBoardType(params.type), [params.type]);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!boardType) return;
    setLoading(true);
    setError(null);
    fetchBoardPosts(boardType)
      .then((data) => setPosts(data))
      .catch((err) => {
        console.error(err);
        setError("게시글을 불러오지 못했습니다.");
      })
      .finally(() => setLoading(false));
  }, [boardType]);

  if (!boardType) {
    return (
      <div className="board-page">
        <p className="board-error">유효하지 않은 게시판입니다.</p>
      </div>
    );
  }

  return (
    <div className="board-page">
      <div className="board-header">
        <h2>{BOARD_LABELS[boardType]}</h2>
        <Link to={`/boards/${boardType}/new`} className="board-write-button">
          글 작성
        </Link>
      </div>
      {loading && <p className="board-empty">불러오는 중...</p>}
      {error && <p className="board-error">{error}</p>}
      {!loading && !error && posts.length === 0 && <p className="board-empty">등록된 게시글이 없습니다.</p>}
      {!loading && !error && posts.length > 0 && (
        <div className="board-table-wrapper" aria-live="polite">
          <table className="board-table">
            <thead>
              <tr>
                <th className="board-col-number">번호</th>
                <th>제목</th>
                <th className="board-col-author">작성자</th>
                <th className="board-col-date">작성일</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td className="board-col-number">{post.id}</td>
                  <td>
                    <Link to={`/boards/${boardType}/posts/${post.id}`} className="board-row-link">
                      {post.title}
                    </Link>
                  </td>
                  <td className="board-col-author">{post.author?.name ?? "-"}</td>
                  <td className="board-col-date">{formatBoardDate(post.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const formatBoardDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "-";
