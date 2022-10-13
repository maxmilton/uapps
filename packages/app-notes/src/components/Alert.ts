import { html } from 'stage1';

type AlertComponent = HTMLDivElement;

type Refs = {
  name: Text;
  text: Text;
};

const view = html`
  <div>
    <b>#name</b>
    #text
  </div>
`;

export const enum AlertType {
  Danger = 'danger',
  Warning = 'warning',
  Success = 'success',
  Info = 'info',
}

export function Alert(
  message: unknown,
  type: AlertType = AlertType.Danger,
): AlertComponent {
  const root = view.cloneNode(true) as AlertComponent;
  const refs = view.collect<Refs>(root);
  let preText;

  switch (type) {
    case AlertType.Danger: {
      preText = 'Error: ';
      break;
    }
    case AlertType.Warning: {
      preText = 'Warning: ';
      break;
    }
    case AlertType.Success: {
      preText = 'Success: ';
      break;
    }
    case AlertType.Info: {
      preText = 'Info: ';
      break;
    }
    default: {
      throw new Error('Unknown alert type');
    }
  }

  root.className = `alert alert-${type}`;
  refs.name.nodeValue = preText;
  refs.text.nodeValue = String(message);

  return root;
}
