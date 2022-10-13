import { append, html } from 'stage1';
import { supabase } from '../supabase';
import type { NoteRow } from '../types';
import { state } from '../utils';
import { Alert } from './Alert';
import type { NoteProps } from './Note';

type EditNoteComponent = HTMLDivElement;
type Refs = {
  title: Text;
  feedback: HTMLDivElement;
  content: HTMLTextAreaElement;
  save: HTMLButtonElement;
  cancel: HTMLButtonElement;
};

interface EditNoteProps {
  id?: number;
  content?: string;
  onDone: (data: NoteProps | null) => void;
}

const view = html`
  <div class="edit-note">
    <h2 class="mt0">#title</h2>

    <div #feedback></div>

    <div class="mb3">
      <textarea class="textarea w100" #content></textarea>
    </div>

    <div class="df">
      <button class="button button-link ml-auto" #cancel>Cancel</button>
      <button class="button button-primary ml3 ph5" #save>Save</button>
    </div>
  </div>
`;

export function EditNote(props: EditNoteProps): EditNoteComponent {
  const root = view.cloneNode(true) as EditNoteComponent;
  const refs = view.collect<Refs>(root);

  refs.title.nodeValue = props.id ? 'Edit note' : 'New note';
  refs.content.innerHTML = props.content || '';

  refs.save.__click = async () => {
    try {
      refs.feedback.textContent = '';

      const res = await supabase
        .from<Omit<NoteRow, 'id'> & { id?: number | undefined }>('notes')
        .upsert({
          id: props.id!,
          user_id: state.session!.user.id,
          edited_at: new Date(),
          content: refs.content.value,
        })
        .single();

      if (res.error) {
        throw new Error(res.error.message);
      }

      props.onDone(res.data as NoteRow);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      append(Alert(error), refs.feedback);
    }
  };

  refs.cancel.__click = () => {
    props.onDone(null);
  };

  return root;
}
