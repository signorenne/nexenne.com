# TODO

## Enable contact-form delivery (Web3Forms)

The contact form (`/contact`) is wired to [Web3Forms](https://web3forms.com) but
needs an access key to actually deliver messages. **Until the key is set, the form
falls back to opening the visitor's email client (`mailto:`)** — submissions are
not delivered to an inbox.

Steps:

1. Go to https://web3forms.com and create a free **Access Key** (enter the email
   where you want to receive submissions, e.g. `nicolo@nexenne.com`). The key is
   public by design — Web3Forms keys are meant to live in client code.
2. **Production (GitHub Pages):** add the key as a repository **secret**
   - Repo → Settings → Secrets and variables → Actions → New repository secret
   - Name: `PUBLIC_WEB3FORMS_ACCESS_KEY`
   - Value: _your key_
   - The deploy workflow already passes it to the build
     (`.github/workflows/deploy.yml`, Build step).
3. **Local testing (optional):** copy `.env.example` to `.env` and set
   `PUBLIC_WEB3FORMS_ACCESS_KEY=your-key`, then `yarn dev`.
4. Verify: submit the form on the deployed site and confirm the message arrives
   in the configured inbox.

Notes:

- The form includes a hidden honeypot (`botcheck`) for basic spam protection.
- No backend needed; this works on the static GitHub Pages build.

## Refresh security.txt yearly

`static/.well-known/security.txt` has an `Expires:` date (currently 2027-06-21).
Bump it ~1 year ahead before it lapses (RFC 9116 requires a future date).
