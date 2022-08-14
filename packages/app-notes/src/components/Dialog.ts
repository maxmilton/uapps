import './Dialog.xcss';

import { append, html } from 'stage1';

type DialogComponent = HTMLDialogElement;
const view = html`<dialog><div class="pa3"></div></dialog>`;

export function Dialog(body: Element): DialogComponent {
  const root = view.cloneNode(true) as DialogComponent;

  append(body, root.firstChild!);

  // close when click is outside the dialog box
  root.__click = (event) => {
    if (event.target === root) {
      root.close();
    }
  };

  root.onclose = () => root.remove();

  setTimeout(() => root.showModal(), 0);

  return root;
}

export function createDialog(body: Element): DialogComponent {
  return append(Dialog(body), document.body);
}
