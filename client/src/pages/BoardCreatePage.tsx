import { useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import FormButton from "../components/FormButton";
import FormInput from "../components/FormInput";
import RichTextEditor from "../components/RichTextEditor";
import { createBoardPost, uploadBoardAttachment } from "../lib/boards";
import type { BoardType } from "../lib/boards";
import { isRichTextEmpty } from "../lib/richText";

const BOARD_LABELS: Record<BoardType, string> = {
  notice: "공지사항",
  resource: "자료실",
};

const TITLE_MAX_LENGTH = 100;

type BoardCreateErrors = {
  title?: string;
  content?: string;
};

const resolveBoardType = (value?: string): BoardType | null => {
  if (value === "notice" || value === "resource") return value;
  return null;
};

export default function BoardCreatePage() {
  const params = useParams();
  const navigate = useNavigate();
  const boardType = useMemo(() => resolveBoardType(params.type), [params.type]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<BoardCreateErrors>({});

  if (!boardType) {
    return <div style={{ padding: 24 }}>유효하지 않은 게시판입니다.</div>;
  }

  const onChangeFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files ? Array.from(event.target.files) : [];
    setFiles(selected);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextFieldErrors: BoardCreateErrors = {};
    const trimmedTitle = title.trim();
    const contentIsEmpty = isRichTextEmpty(content);

    if (!trimmedTitle) {
      nextFieldErrors.title = "제목을 입력해주세요.";
    } else if (trimmedTitle.length > TITLE_MAX_LENGTH) {
      nextFieldErrors.title = `제목은 최대 ${TITLE_MAX_LENGTH}자까지 입력할 수 있습니다.`;
    }

    if (content.length > 0 && contentIsEmpty) {
      nextFieldErrors.content = "내용은 공백만 입력할 수 없습니다.";
    }

    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      setError("입력값을 확인해주세요.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const created = await createBoardPost(boardType, {
        title: trimmedTitle,
        content: contentIsEmpty ? null : content,
      });

      if (files.length > 0) {
        await Promise.all(files.map((file) => uploadBoardAttachment(boardType, created.id, file)));
      }

      navigate(`/boards/${boardType}/posts/${created.id}`);
    } catch (err) {
      console.error(err);
      setError("게시글을 저장하지 못했습니다.");
      setFieldErrors({
        title: "제목을 확인한 뒤 다시 시도해주세요.",
        content: "내용을 확인한 뒤 다시 시도해주세요.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Link to={`/boards/${boardType}`}>← {BOARD_LABELS[boardType]} 목록</Link>
      <h2 style={{ marginTop: 12 }}>{BOARD_LABELS[boardType]} 작성</h2>
      {error && <p className="board-error">{error}</p>}
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, maxWidth: 640 }}>
        <label>
          제목
          <FormInput
            type="text"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setFieldErrors((prev) => ({ ...prev, title: undefined }));
            }}
            maxLength={TITLE_MAX_LENGTH}
            hasError={Boolean(fieldErrors.title)}
            aria-invalid={Boolean(fieldErrors.title)}
            style={{ marginTop: 6 }}
          />
          {fieldErrors.title && <div style={{ marginTop: 6, color: "crimson" }}>{fieldErrors.title}</div>}
        </label>
        <label>
          내용
          <div style={{ marginTop: 6 }}>
            <RichTextEditor
              value={content}
              onChange={(value) => {
                setContent(value);
                setFieldErrors((prev) => ({ ...prev, content: undefined }));
              }}
              placeholder="내용을 입력해주세요."
              disabled={saving}
            />
          </div>
          {fieldErrors.content && (
            <div style={{ marginTop: 6, color: "crimson" }}>{fieldErrors.content}</div>
          )}
        </label>
        <label>
          첨부파일
          <input
            type="file"
            multiple
            onChange={onChangeFiles}
            style={{ marginTop: 6, display: "block" }}
            disabled={saving}
          />
          {files.length > 0 && (
            <ul style={{ marginTop: 6, paddingLeft: 18 }}>
              {files.map((file) => (
                <li key={`${file.name}-${file.size}-${file.lastModified}`}>{file.name}</li>
              ))}
            </ul>
          )}
        </label>
        <div style={{ display: "flex", gap: 12 }}>
          <FormButton type="submit" disabled={saving}>
            {saving ? "저장 중..." : "저장"}
          </FormButton>
          <FormButton
            type="button"
            variant="secondary"
            onClick={() => navigate(-1)}
            disabled={saving}
          >
            취소
          </FormButton>
        </div>
      </form>
    </div>
  );
}
