// import './home.xcss';

import { append, clone, collect, h, ONCLICK } from "stage1/fast";
import { compile } from "stage1/macro" with { type: "macro" };

type HomePageComponent = HTMLDivElement;
interface Refs {
  feedback: HTMLDivElement;
}

const meta = compile<Refs>(
  `
    <div class=con>
      <h1>🔗</h1>

      <div @feedback></div>

      <p class=lead>Home home home.</p>
    </div>
  `,
  // { keepSpaces: true },
);
let view: HomePageComponent | undefined;

function HomePage(): HomePageComponent {
  const root = clone(view ??= h<HomePageComponent>(meta.html));
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

export default HomePage;
