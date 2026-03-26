import { api, resolveFileUrl } from "./api";

export type BoardType = "notice" | "resource";

export type BoardPost = {
  id: number;
  board_type: BoardType;
  title: string;
  content?: string | null;
  author_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  author?: {
    id: number;
    name: string;
    login_id?: string | null;
  };
};

export type BoardAttachment = {
  id: number;
  board_post_id: number;
  file_name: string;
  file_url: string;
  mime_type?: string | null;
  size?: number | null;
  uploaded_by_employee_id?: number | null;
  created_at?: string | null;
};

export type BoardPostInput = {
  title: string;
  content?: string | null;
};

export async function fetchBoardPosts(type: BoardType) {
  return api<BoardPost[]>(`/boards/${type}/posts`);
}

export async function fetchBoardPost(type: BoardType, id: number) {
  return api<BoardPost>(`/boards/${type}/posts/${id}`);
}

export async function fetchBoardAttachments(type: BoardType, postId: number) {
  const attachments = await api<BoardAttachment[]>(`/boards/${type}/posts/${postId}/attachments`);
  return attachments.map((attachment) => ({
    ...attachment,
    file_url: resolveFileUrl(attachment.file_url),
  }));
}

export async function createBoardPost(type: BoardType, input: BoardPostInput) {
  return api<BoardPost>(`/boards/${type}/posts`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function uploadBoardAttachment(type: BoardType, postId: number, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const attachment = await api<BoardAttachment>(`/boards/${type}/posts/${postId}/attachments`, {
    method: "POST",
    body: formData,
  });
  return { ...attachment, file_url: resolveFileUrl(attachment.file_url) };
}

export async function deleteBoardAttachment(type: BoardType, postId: number, attachmentId: number) {
  return api<{ ok: boolean }>(`/boards/${type}/posts/${postId}/attachments/${attachmentId}`, {
    method: "DELETE",
  });
}

export async function updateBoardPost(type: BoardType, id: number, input: BoardPostInput) {
  return api<BoardPost>(`/boards/${type}/posts/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteBoardPost(type: BoardType, id: number) {
  return api<{ ok: boolean }>(`/boards/${type}/posts/${id}`, {
    method: "DELETE",
  });
}
