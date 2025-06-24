import { append, clone, collect, create, h, ONCLICK } from 'stage1/fast';
import { compile } from 'stage1/macro' with { type: 'macro' };
import { Status } from '../net';
import { AppError } from '../utils';

interface ErrorLike {
  code?: number;
  message?: unknown;
}

type ErrorPageComponent = HTMLDivElement;

interface Refs {
  title: Text;
  message: Text;
  home: HTMLButtonElement;
  back: HTMLButtonElement;
}

const meta = compile<Refs>(`
  <div class=con>
    <h1>@title</h1>
    <p class="lead break">@message</p>

    <div class=mt4>
      <button @home class="button button-primary mr3 ph4">
        Go to app home
      </button>
      <button @back class=button>Go back</button>
    </div>
  </div>
`);
let view: ErrorPageComponent | undefined;

function ErrorPage(error?: unknown): ErrorPageComponent {
  const root = clone((view ??= h<ErrorPageComponent>(meta.html)));
  const refs = collect<Refs>(root, meta.d);

  const ex =
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    error || new AppError('An unknown error occurred', Status.UNKNOWN_ERROR);
  let code: unknown;
  let message: unknown;

  window.bugbox?.send(ex as Error);

  if (typeof ex === 'object') {
    code = (ex as ErrorLike).code;
    message = (ex as ErrorLike).message;
  }

  // eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions
  refs[meta.ref.title].nodeValue = `${code ?? ''} Error`;
  // eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/restrict-template-expressions
  document.title = `${code ?? ''} Error | 🔗`;
  // eslint-disable-next-line @typescript-eslint/no-base-to-string, @typescript-eslint/prefer-nullish-coalescing
  refs[meta.ref.message].nodeValue = String(message || ex);

  refs[meta.ref.home][ONCLICK] = () => {
    window.location.href = '/';
  };
  refs[meta.ref.back][ONCLICK] = () => {
    window.history.back();
  };

  if (
    // empty referrer or navigated directly e.g., from the URL bar or a bookmark
    !document.referrer ||
    // came from another site
    new URL(document.referrer).origin !== window.location.origin ||
    // router, which uses a main element as root, hasn't been initialized yet
    // so it wouldn't be able to handle updating the route
    !document.querySelector('main')
  ) {
    refs[meta.ref.back].hidden = true;
  }

  if (
    process.env.NODE_ENV === 'development' &&
    ex instanceof Error &&
    ex.stack
  ) {
    const block = create('code');
    block.className = 'code-block mt4';
    block.textContent = ex.stack;
    append(block, root);
  }

  return root;
}

export default ErrorPage;
