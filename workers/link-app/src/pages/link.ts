// import './link.xcss';

import { append, clone, collect, h, ONCLICK } from "stage1/fast";
import { compile } from "stage1/macro" with { type: "macro" };

type LinkPageComponent = HTMLDivElement;
interface Refs {
  feedback: HTMLDivElement;
}

const meta = compile<Refs>(
  `
    <div class=con>
      <h1>🔗</h1>

      <div @feedback></div>

      <p class=lead>Link link link.</p>
    </div>
  `,
  // { keepSpaces: true },
);
let view: LinkPageComponent | undefined;

function LinkPage(id: string): LinkPageComponent {
  const root = clone(view ??= h<LinkPageComponent>(meta.html));
  const refs = collect<Refs>(root, meta.d);

  // const off1 = state.on('feedback', (feedback) => {
  //   refs.feedback.textContent = '';

  //   if (feedback) {
  //     append(feedback, refs.feedback);
  //   }
  // });

  // onRemove(root, () => {
  //   off1();
  // });

  document.title = "🔗";

  return root;
}

export default LinkPage;
