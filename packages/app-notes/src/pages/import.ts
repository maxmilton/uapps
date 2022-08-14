import { append, html } from 'stage1';
import { Alert, AlertType } from '../components/Alert';
import { supabase } from '../supabase';
import type { NoteRow } from '../types';
import { state } from '../utils';

type ImportPageComponent = HTMLDivElement;
type Refs = {
  feedback: HTMLDivElement;
  form: HTMLFormElement;
  files: HTMLInputElement;
};

const view = html`
  <main class="con">
    <h1>Import</h1>
    <p class="lead">Import notes from Google Keep JSON files.</p>

    <div #feedback></div>

    <form #form>
      <div class="mb3">
        <input
          class="input"
          type="file"
          name="files"
          accept=".json"
          multiple
          #files
        />
      </div>

      <button class="button button-primary ph5" type="submit">Import</button>
      <a href="/" class="link-button ml4">Cancel</a>
    </form>
  </main>
`;

interface GoogleKeepData {
  color: string;
  createdTimestampUsec: number;
  isArchived: boolean;
  isPinned: boolean;
  isTrashed: boolean;
  textContent?: string;
  listContent?: { text: string; isChecked: boolean }[];
  title: string;
  userEditedTimestampUsec: number;
}

export function ImportPage(): ImportPageComponent {
  const root = view.cloneNode(true) as ImportPageComponent;
  const refs = view.collect<Refs>(root);

  refs.form.onsubmit = async (event) => {
    event.preventDefault();
    refs.feedback.textContent = '';

    try {
      if (!refs.files.files || refs.files.files.length === 0) {
        throw new Error('No files selected');
      }

      const rows = [];

      for (const file of refs.files.files) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const data = JSON.parse(await file.text()) as GoogleKeepData;

          let content = '';

          if (data.title) {
            content += `## ${data.title}\n\n`;
          }
          if (data.textContent) {
            content += data.textContent;
          }
          if (data.listContent) {
            content += data.listContent
              .map((item) => `- [${item.isChecked ? 'x' : ' '}] ${item.text}`)
              .join('\n');
          }

          if (!content) {
            throw new Error('No content found');
          }

          rows.push({
            user_id: state.session!.user!.id,
            created_at: new Date(data.createdTimestampUsec / 1000),
            edited_at: new Date(data.userEditedTimestampUsec / 1000),
            trashed: data.isTrashed,
            pinned: data.isPinned,
            content,
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(error);
          append(
            Alert(`Error importing ${file.name}, skipping file.`),
            refs.feedback,
          );
        }
      }

      const res = await supabase.from<NoteRow>('notes').insert(rows, {
        returning: 'minimal',
        count: 'exact',
      });

      if (res.error) {
        throw new Error(res.error.message);
      }

      if (!res.count) {
        throw new Error('No notes imported');
      }

      if (res.count !== rows.length) {
        append(
          Alert(
            `Skipped ${rows.length - res.count} files due to errors.`,
            AlertType.Warning,
          ),
          refs.feedback,
        );
      }

      append(
        Alert(`${res.count} notes imported.`, AlertType.Success),
        refs.feedback,
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      append(Alert(error), refs.feedback);
    }
  };

  return root;
}
