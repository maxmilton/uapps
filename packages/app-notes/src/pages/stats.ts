import { append, html } from 'stage1';
import { Alert } from '../components/Alert';
import { supabase } from '../supabase';

type StatspageComponent = HTMLDivElement;
type Refs = {
  feedback: HTMLDivElement;
  count: Text;
};

const view = html`
  <main class="con">
    <h1>Stats</h1>

    <div #feedback></div>

    <h2>Your account</h2>
    <p>#count</p>
  </main>
`;

export function StatsPage(): StatspageComponent {
  const root = view.cloneNode(true) as StatspageComponent;
  const refs = view.collect<Refs>(root);

  const update = async () => {
    refs.feedback.textContent = '';

    try {
      const [res1, res2] = await Promise.all([
        supabase.from('notes').select('*', { count: 'exact', head: true }),
        supabase
          .from('notes')
          .select('*', { count: 'exact', head: true })
          .eq('trashed', true),
      ]);

      if (res1.error) {
        throw new Error(res1.error.message);
      }
      if (res2.error) {
        throw new Error(res2.error.message);
      }

      refs.count.nodeValue = `${res1.count || 0} notes (${
        (res1.count || 0) - (res2.count || 0)
      } in notebook, ${res2.count || 0} in trash)`;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      append(Alert(error), refs.feedback);
    }
  };

  void update();

  return root;
}
