import './Note.xcss';

import snarkdown from 'snarkdown';
import { html } from 'stage1';
import { supabase } from '../supabase';
import type { NoteRow } from '../types';
import { createDialog } from './Dialog';
import { EditNote } from './EditNote';

type NoteComponent = HTMLDivElement;
type Refs = {
  pin: HTMLButtonElement;
  edit: HTMLButtonElement;
  trash: HTMLButtonElement;
  content: HTMLDivElement;
};

export interface NoteProps extends NoteRow {
  id: number;
}

const view = html`
  <div class="note card">
    <div class="button-group note-buttons">
      <button class="button" #pin></button>
      <button class="button" #edit>Edit</button>
      <button class="button" #trash>🗑️</button>
    </div>
    <div class="card-body clamp" #content></div>
  </div>
`;

export function Note(props: NoteProps): NoteComponent {
  const root = view.cloneNode(true) as NoteComponent;
  const refs = view.collect<Refs>(root);
  let currentData = props;

  const update = (data: NoteProps) => {
    refs.content.innerHTML = snarkdown(data.content || '');
    // refs.pin.textContent = data.pinned ? '📌' : '📌';
    refs.pin.textContent = data.pinned ? '★' : '☆';
    currentData = data;
  };

  refs.edit.__click = () => {
    const dialog = createDialog(
      EditNote({
        ...currentData,
        onDone: (data) => {
          dialog.close();
          if (data) update(data);
        },
      }),
    );
  };

  refs.pin.__click = async () => {
    try {
      const res = await supabase
        .from<NoteRow>('notes')
        .update({
          id: props.id,
          edited_at: new Date(),
          pinned: !props.pinned,
        })
        .single();

      if (res.error) {
        throw new Error(res.error.message);
      }

      // FIXME: This should also move the note to the correct parent
      update(res.data);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      // createDialog(Alert(error.message));
    }
  };

  refs.trash.__click = async () => {
    try {
      const res = await supabase
        .from<NoteRow>('notes')
        .update({
          trashed: true,
        })
        .match({
          id: props.id,
        });

      if (res.error) {
        throw new Error(res.error.message);
      }

      root.remove();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      // createDialog(Alert(error.message));
    }
  };

  root.__click = () => {
    console.log('TODO: Open full size note');
  };

  update(props);

  return root;
}
