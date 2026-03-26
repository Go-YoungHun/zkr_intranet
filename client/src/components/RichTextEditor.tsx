import { useEffect, useMemo } from "react";
import type { CSSProperties } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: number;
  maxHeight?: number;
};

const buttonStyle: CSSProperties = {
  border: "1px solid #d1d5db",
  background: "#fff",
  borderRadius: 6,
  padding: "4px 8px",
  fontSize: 12,
  cursor: "pointer",
};

const activeButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: "#e0f2fe",
  borderColor: "#38bdf8",
  color: "#0c4a6e",
};

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  disabled = false,
  minHeight = 140,
  maxHeight,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    editable: !disabled,
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  const toolbarActions = useMemo(
    () => [
      {
        label: "B",
        title: "굵게",
        isActive: () => editor?.isActive("bold") ?? false,
        onClick: () => editor?.chain().focus().toggleBold().run(),
      },
      {
        label: "I",
        title: "기울임",
        isActive: () => editor?.isActive("italic") ?? false,
        onClick: () => editor?.chain().focus().toggleItalic().run(),
      },
      {
        label: "S",
        title: "취소선",
        isActive: () => editor?.isActive("strike") ?? false,
        onClick: () => editor?.chain().focus().toggleStrike().run(),
      },
      {
        label: "H2",
        title: "소제목",
        isActive: () => editor?.isActive("heading", { level: 2 }) ?? false,
        onClick: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        label: "인용",
        title: "인용문",
        isActive: () => editor?.isActive("blockquote") ?? false,
        onClick: () => editor?.chain().focus().toggleBlockquote().run(),
      },
      {
        label: "• 목록",
        title: "불릿 목록",
        isActive: () => editor?.isActive("bulletList") ?? false,
        onClick: () => editor?.chain().focus().toggleBulletList().run(),
      },
      {
        label: "1. 목록",
        title: "숫자 목록",
        isActive: () => editor?.isActive("orderedList") ?? false,
        onClick: () => editor?.chain().focus().toggleOrderedList().run(),
      },
      {
        label: "{ }",
        title: "코드 블록",
        isActive: () => editor?.isActive("codeBlock") ?? false,
        onClick: () => editor?.chain().focus().toggleCodeBlock().run(),
      },
      {
        label: "―",
        title: "구분선",
        isActive: () => false,
        onClick: () => editor?.chain().focus().setHorizontalRule().run(),
      },
      {
        label: "↺",
        title: "되돌리기",
        isActive: () => false,
        onClick: () => editor?.chain().focus().undo().run(),
      },
      {
        label: "↻",
        title: "다시하기",
        isActive: () => false,
        onClick: () => editor?.chain().focus().redo().run(),
      },
    ],
    [editor],
  );

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
        {toolbarActions.map((action) => (
          <button
            key={action.title}
            type="button"
            title={action.title}
            onClick={action.onClick}
            style={action.isActive() ? activeButtonStyle : buttonStyle}
            disabled={disabled || !editor}
          >
            {action.label}
          </button>
        ))}
      </div>
      {placeholder && !value && (
        <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>{placeholder}</div>
      )}
      <div
        style={{
          border: "1px solid #d1d5db",
          borderRadius: 10,
          padding: 12,
          minHeight,
          maxHeight,
          overflowY: maxHeight ? "auto" : undefined,
          background: disabled ? "#f9fafb" : "#fff",
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
