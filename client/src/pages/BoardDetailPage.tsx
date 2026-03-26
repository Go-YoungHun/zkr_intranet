import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import FormButton from "../components/FormButton";
import FormInput from "../components/FormInput";
import RichTextEditor from "../components/RichTextEditor";
import {
  deleteBoardAttachment,
  fetchBoardAttachments,
  fetchBoardPost,
  updateBoardPost,
  uploadBoardAttachment,
} from "../lib/boards";
import type { BoardAttachment, BoardPost, BoardType } from "../lib/boards";
import { isRichTextEmpty } from "../lib/richText";
import { sanitizeHtml } from "../lib/sanitizeHtml";

const BOARD_LABELS: Record<BoardType, string> = {
  notice: "공지사항",
  resource: "자료실",
};
const TITLE_MAX_LENGTH = 100;

const resolveBoardType = (value?: string): BoardType | null => {
  if (value === "notice" || value === "resource") return value;
  return null;
};

const formatBytes = (value?: number | null) => {
  if (!value || value <= 0) return "크기 정보 없음";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export default function BoardDetailPage() {
  const params = useParams();
  const boardType = useMemo(() => resolveBoardType(params.type), [params.type]);
  const postId = Number(params.id);
  const [post, setPost] = useState<BoardPost | null>(null);
  const [attachments, setAttachments] = useState<BoardAttachment[]>([]);
  const [attachmentFiles, setAttachmentFiles] = useState<
    Array<{ id: number; file: File | null }>
  >([]);
  const attachmentDraftIdRef = useRef(0);
  const [loading, setLoading] = useState(false);
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savingPost, setSavingPost] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isAttachmentEditing, setIsAttachmentEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; content?: string }>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!boardType || !Number.isFinite(postId)) return;

    setLoading(true);
    setError(null);

    Promise.all([fetchBoardPost(boardType, postId), fetchBoardAttachments(boardType, postId)])
      .then(([postData, attachmentData]) => {
        setPost(postData);
        setAttachments(attachmentData);
        setDraftTitle(postData.title ?? "");
        setDraftContent(postData.content ?? "");
      })
      .catch((err) => {
        console.error(err);
        setError("게시글을 불러오지 못했습니다.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [boardType, postId]);

  const refreshAttachments = async () => {
    if (!boardType || !Number.isFinite(postId)) return;

    setAttachmentLoading(true);
    try {
      const rows = await fetchBoardAttachments(boardType, postId);
      setAttachments(rows);
    } catch (err) {
      console.error(err);
      setError("첨부파일을 불러오지 못했습니다.");
    } finally {
      setAttachmentLoading(false);
    }
  };

  const onAddAttachmentRow = () => {
    if (!isAttachmentEditing) return;
    setAttachmentFiles((prev) => [
      ...prev,
      { id: attachmentDraftIdRef.current++, file: null },
    ]);
  };

  const onRemoveAttachmentRow = (id: number) => {
    if (!isAttachmentEditing) return;
    setAttachmentFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const onAttachmentFileChange = (id: number, file: File | null) => {
    if (!isAttachmentEditing) return;
    setAttachmentFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, file } : item)),
    );
  };

  const onUploadFiles = async () => {
    if (!isAttachmentEditing) return;
    if (!boardType || !Number.isFinite(postId)) return;

    if (attachmentFiles.length === 0) {
      setError("첨부 파일 행을 추가해주세요.");
      return;
    }

    const invalidRows = attachmentFiles
      .map((item, index) => ({ item, rowNumber: index + 1 }))
      .filter(({ item }) => !item.file);
    if (invalidRows.length > 0) {
      setError(
        `파일이 누락된 행이 있습니다: ${invalidRows
          .map(({ rowNumber }) => `${rowNumber}행`)
          .join(", ")}`,
      );
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const results = await Promise.allSettled(
        attachmentFiles.map((item) =>
          uploadBoardAttachment(boardType, postId, item.file as File),
        ),
      );
      const failedRows: number[] = [];
      const succeededDraftIds = new Set<number>();
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          succeededDraftIds.add(attachmentFiles[index].id);
        } else {
          failedRows.push(index + 1);
        }
      });

      setAttachmentFiles((prev) =>
        prev.filter((item) => !succeededDraftIds.has(item.id)),
      );

      await refreshAttachments();

      if (failedRows.length > 0) {
        setError(`일부 행 업로드에 실패했습니다: ${failedRows.join(", ")}행`);
      }
    } catch (err) {
      console.error(err);
      setError("첨부파일을 업로드하지 못했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const sanitizedContent = useMemo(() => sanitizeHtml(post?.content ?? ""), [post?.content]);

  const onDeleteAttachment = async (attachmentId: number) => {
    if (!isAttachmentEditing) return;
    if (!boardType || !Number.isFinite(postId)) return;

    const confirmDelete = window.confirm("첨부파일을 삭제하시겠습니까?");
    if (!confirmDelete) return;

    try {
      await deleteBoardAttachment(boardType, postId, attachmentId);
      await refreshAttachments();
    } catch (err) {
      console.error(err);
      setError("첨부파일을 삭제하지 못했습니다.");
    }
  };

  const onAttachmentEditCancel = () => {
    setAttachmentFiles([]);
    setError(null);
    setIsAttachmentEditing(false);
  };

  const onStartEdit = () => {
    if (!post) return;
    setDraftTitle(post.title ?? "");
    setDraftContent(post.content ?? "");
    setFieldErrors({});
    setError(null);
    setAttachmentFiles([]);
    setIsEditing(true);
    setIsAttachmentEditing(true);
  };

  const onCancelEdit = () => {
    setDraftTitle(post?.title ?? "");
    setDraftContent(post?.content ?? "");
    setFieldErrors({});
    onAttachmentEditCancel();
    setIsEditing(false);
  };

  const onSavePost = async () => {
    if (!boardType || !Number.isFinite(postId) || !post) return;

    const trimmedTitle = draftTitle.trim();
    const contentIsEmpty = isRichTextEmpty(draftContent);
    const nextFieldErrors: { title?: string; content?: string } = {};

    if (!trimmedTitle) {
      nextFieldErrors.title = "제목을 입력해주세요.";
    } else if (trimmedTitle.length > TITLE_MAX_LENGTH) {
      nextFieldErrors.title = `제목은 최대 ${TITLE_MAX_LENGTH}자까지 입력할 수 있습니다.`;
    }

    if (draftContent.length > 0 && contentIsEmpty) {
      nextFieldErrors.content = "내용은 공백만 입력할 수 없습니다.";
    }

    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      setError("입력값을 확인해주세요.");
      return;
    }

    setSavingPost(true);
    setError(null);
    try {
      const updated = await updateBoardPost(boardType, postId, {
        title: trimmedTitle,
        content: contentIsEmpty ? null : draftContent,
      });
      setPost(updated);
      setDraftTitle(updated.title ?? "");
      setDraftContent(updated.content ?? "");
      setAttachmentFiles([]);
      setFieldErrors({});
      setIsEditing(false);
      setIsAttachmentEditing(false);
    } catch (err) {
      console.error(err);
      setError("게시글을 저장하지 못했습니다.");
    } finally {
      setSavingPost(false);
    }
  };

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
        <Link to={`/boards/${boardType}`} className="board-write-button board-write-button--secondary">
          ← 목록
        </Link>
      </div>
      {loading && <p className="board-empty">불러오는 중...</p>}
      {error && <p className="board-error">{error}</p>}
      {post && (
        <article className="board-card board-detail-card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>{post.title}</h2>
            {!isEditing && (
              <FormButton type="button" onClick={onStartEdit}>
                수정
              </FormButton>
            )}
          </div>
          <div className="board-meta">
            {post.author?.name ? `${post.author.name} · ` : null}
            {post.created_at ? new Date(post.created_at).toLocaleString() : "등록일 미상"}
          </div>
          {isEditing ? (
            <div style={{ display: "grid", gap: 12 }}>
              <label>
                제목
                <FormInput
                  type="text"
                  value={draftTitle}
                  onChange={(event) => {
                    setDraftTitle(event.target.value);
                    setFieldErrors((prev) => ({ ...prev, title: undefined }));
                  }}
                  maxLength={TITLE_MAX_LENGTH}
                  hasError={Boolean(fieldErrors.title)}
                  aria-invalid={Boolean(fieldErrors.title)}
                  style={{ marginTop: 6 }}
                  disabled={savingPost || uploading}
                />
                {fieldErrors.title && <div style={{ marginTop: 6, color: "crimson" }}>{fieldErrors.title}</div>}
              </label>
              <label>
                내용
                <div style={{ marginTop: 6 }}>
                  <RichTextEditor
                    value={draftContent}
                    onChange={(value) => {
                      setDraftContent(value);
                      setFieldErrors((prev) => ({ ...prev, content: undefined }));
                    }}
                    placeholder="내용을 입력해주세요."
                    disabled={savingPost || uploading}
                  />
                </div>
                {fieldErrors.content && (
                  <div style={{ marginTop: 6, color: "crimson" }}>{fieldErrors.content}</div>
                )}
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <FormButton type="button" onClick={onSavePost} disabled={savingPost || uploading}>
                  {savingPost ? "저장 중..." : "수정 저장"}
                </FormButton>
                <FormButton
                  type="button"
                  variant="secondary"
                  onClick={onCancelEdit}
                  disabled={savingPost || uploading}
                >
                  취소
                </FormButton>
              </div>
            </div>
          ) : (
            <div className="board-content">
              {!isRichTextEmpty(sanitizedContent) ? (
                <div className="board-content-html" dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
              ) : (
                "내용이 없습니다."
              )}
            </div>
          )}

          <section style={{ marginTop: 20 }}>
            <h3 style={{ marginBottom: 10 }}>첨부파일</h3>
            {!isAttachmentEditing && (
              <div style={{ marginBottom: 8, color: "#6b7280", fontSize: 13 }}>
                첨부파일 수정은 게시글 [수정] 모드에서 가능합니다.
              </div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {isAttachmentEditing ? (
                <>
                  <FormButton
                    type="button"
                    variant="secondary"
                    onClick={onAddAttachmentRow}
                    disabled={uploading}
                  >
                    첨부파일 행 추가
                  </FormButton>
                  <FormButton
                    type="button"
                    onClick={onUploadFiles}
                    disabled={uploading || attachmentFiles.length === 0}
                  >
                    {uploading ? "업로드 중..." : "첨부파일 업로드"}
                  </FormButton>
                  <FormButton
                    type="button"
                    variant="secondary"
                    onClick={onAttachmentEditCancel}
                    disabled={uploading || savingPost}
                  >
                    취소
                  </FormButton>
                </>
              ) : null}
            </div>

            {attachmentFiles.length > 0 && (
              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gap: 8,
                  maxWidth: 520,
                }}
              >
                {attachmentFiles.map((item, index) => (
                  <div
                    key={item.id}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span style={{ minWidth: 42, color: "#6b7280", fontSize: 13 }}>
                      {index + 1}행
                    </span>
                    <input
                      type="file"
                      onChange={(event) =>
                        onAttachmentFileChange(
                          item.id,
                          event.target.files?.[0] ?? null,
                        )
                      }
                      disabled={uploading}
                    />
                    <FormButton
                      type="button"
                      variant="secondary"
                      onClick={() => onRemoveAttachmentRow(item.id)}
                      disabled={uploading}
                    >
                      행 삭제
                    </FormButton>
                  </div>
                ))}
              </div>
            )}

            {attachmentLoading && <p style={{ marginTop: 8 }}>첨부파일 갱신 중...</p>}

            {attachments.length === 0 ? (
              <p style={{ marginTop: 10 }}>첨부파일이 없습니다.</p>
            ) : (
              <ul style={{ marginTop: 10, paddingLeft: 18 }}>
                {attachments.map((attachment) => (
                  <li
                    key={attachment.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 6,
                    }}
                  >
                    <a href={attachment.file_url} target="_blank" rel="noopener noreferrer" download>
                      {attachment.file_name}
                    </a>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: "#666", fontSize: 12 }}>{formatBytes(attachment.size)}</span>
                      <button
                        type="button"
                        onClick={() => onDeleteAttachment(attachment.id)}
                        disabled={!isAttachmentEditing}
                        style={{
                          border: "1px solid #ddd",
                          borderRadius: 6,
                          background: "#fff",
                          padding: "2px 8px",
                          cursor: isAttachmentEditing ? "pointer" : "not-allowed",
                          opacity: isAttachmentEditing ? 1 : 0.5,
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

        </article>
      )}
    </div>
  );
}
