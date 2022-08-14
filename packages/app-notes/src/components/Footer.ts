import { html, S1Node } from 'stage1';

export type FooterComponent = S1Node & HTMLElement;

const view = html`
  <footer class="mv4 fss muted tc">
    © <a href=https://maxmilton.com class="normal muted" rel=noreferrer>Max Milton</a> ・ ${process.env.APP_RELEASE} ・ <a href=https://github.com/maxmilton/uapps/issues rel=noreferrer>report bug</a>
  </footer>
`;

export function Footer(): FooterComponent {
  return view as FooterComponent;
}
