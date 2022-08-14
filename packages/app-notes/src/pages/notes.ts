import './notes.xcss';

import { append, html, prepend } from 'stage1';
import { Alert, AlertType } from '../components/Alert';
import { createDialog } from '../components/Dialog';
import { EditNote } from '../components/EditNote';
import { Note } from '../components/Note';
import { supabase } from '../supabase';
import type { NoteRow } from '../types';

type NotesPageComponent = HTMLDivElement;
type Refs = {
  search: HTMLInputElement;
  new: HTMLButtonElement;
  feedback: HTMLDivElement;
  pinned: HTMLDivElement;
  notes: HTMLDivElement;
};

const view = html`
  <main class="con">
    <nav class="dfc">
      <input class="input w100 mr3" placeholder="Search" #search />
      <button class="button ml-auto wsn" #new>New note</button>
    </nav>

    <div #feedback></div>

    <div class="magic-grid" #pinned></div>
    <div class="magic-grid" #notes></div>
  </main>
`;

const notesCols = 'id,edited_at,pinned,content';

export function NotesPage(params: URLSearchParams): NotesPageComponent {
  const root = view.cloneNode(true) as NotesPageComponent;
  const refs = view.collect<Refs>(root);

  if ('layoutWorklet' in CSS) {
    // https://developer.mozilla.org/en-US/docs/Web/API/Worklet/addModule
    // @ts-expect-error - experimental API
    // eslint-disable-next-line
    CSS.layoutWorklet.addModule('masonry.js');
  } else {
    setTimeout(() => {
      append(
        Alert(
          'CSS Layout API not supported; no masonry grid.',
          AlertType.Warning,
        ),
        refs.feedback,
      );
    }, 0);
  }

  const init = async () => {
    try {
      refs.feedback.textContent = '';

      const res = await supabase
        .from<NoteRow>('notes')
        .select(notesCols)
        .eq('trashed', params.get('view') === 'trash');

      if (res.error) {
        throw new Error(res.error.message);
      }

      refs.pinned.textContent = '';
      refs.notes.textContent = '';

      if (res.data.length === 0) {
        append(
          Alert(
            `No${params.get('view') === 'trash' ? ' trashed' : ''} notes found`,
            AlertType.Info,
          ),
          refs.feedback,
        );
      } else {
        for (const note of res.data) {
          append(Note(note), note.pinned ? refs.pinned : refs.notes);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      append(Alert(error), refs.feedback);
    }
  };

  const search = async (query: string) => {
    try {
      refs.feedback.textContent = '';

      const res = await supabase
        .from<NoteRow>('notes')
        .select(notesCols)
        .eq('trashed', params.get('view') === 'trash')
        .textSearch('content', query);

      if (res.error) {
        throw new Error(res.error.message);
      }

      refs.pinned.textContent = '';
      refs.notes.textContent = '';

      if (res.data.length === 0) {
        append(
          Alert(
            `No${
              params.get('view') === 'trash' ? ' trashed' : ''
            } notes found matching your search query`,
            AlertType.Info,
          ),
          refs.feedback,
        );
      } else {
        for (const note of res.data) {
          append(Note(note), refs.notes);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      append(Alert(error), refs.feedback);
    }
  };

  refs.search.onkeydown = (event) => {
    if (event.key === 'Enter') {
      void search(refs.search.value);
    } else if (event.key === 'Escape') {
      refs.search.value = '';
      void init();
    }
  };

  refs.new.__click = () => {
    const dialog = createDialog(
      EditNote({
        onDone: (data) => {
          dialog.close();
          if (data) prepend(Note(data), refs.notes);
        },
      }),
    );
  };

  void init();

  return root;
}
