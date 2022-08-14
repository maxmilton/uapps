export interface NoteRow {
  id: number;
  user_id: string; // uuid v4
  created_at: Date;
  edited_at: Date;
  trashed: boolean;
  pinned: boolean;
  content: string;
}
