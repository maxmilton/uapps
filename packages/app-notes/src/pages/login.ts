import './login.xcss';

import { append, html } from 'stage1';
import { Alert, AlertType } from '../components/Alert';
import { supabase } from '../supabase';

type LoginPageComponent = HTMLFormElement;

type RefNodes = {
  feedback: HTMLDivElement;
  email: HTMLInputElement;
};

const view = html`
  <form id="login" class="card">
    <h1 class="mt0">Sign in to Notes</h1>
    <p class="lead">Sign in via magic link with your email below.</p>

    <div #feedback></div>

    <div class="mb3">
      <label class="label" for="email">Email</label>
      <input class="input w100" type="email" name="email" #email />
    </div>

    <button class="button button-primary mt2" type="submit">
      Send magic link
    </button>
  </form>
`;

export function LoginPage(): LoginPageComponent {
  const root = view.cloneNode(true) as LoginPageComponent;
  const refs = view.collect<RefNodes>(root);

  root.onsubmit = async (event) => {
    event.preventDefault();
    refs.feedback.textContent = '';

    try {
      const result = await supabase.auth.signIn(
        { email: refs.email.value },
        { shouldCreateUser: process.env.NODE_ENV === 'development' },
      );

      if (result.error) {
        throw new Error(result.error.message);
      }

      append(
        Alert('Check your email for a magic sign in link.', AlertType.Success),
        refs.feedback,
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      append(Alert(error), refs.feedback);
    }
  };

  return root;
}
