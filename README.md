An internal tool that allows tracking of clients, invoices, vendors, expenses, and goals, on a monthly and yearly basis.

## Local Development

The local stack builds the same Docker images that run in production, so local
and cloud differ only by configuration.

### One-time setup — SSL + local domain

```bash
npm run local -- setup
```

- Installs `mkcert` (via Homebrew) if missing and trusts the local CA.
- Generates `docker/certs/biz.loc.pem` and `docker/certs/biz.loc-key.pem`, covering `biz.loc`, `api.biz.loc`, and `*.biz.loc`.
- Ensures `/etc/hosts` contains `127.0.0.1 biz.loc` and `127.0.0.1 api.biz.loc` (prompts for `sudo` only if needed).

### Run the stack

```bash
npm start                 # start
npm run restart           # rebuild images and restart
npm stop                  # stop, keeping volumes
npm run local -- logs web
npm run local -- reset    # recreate and wipe volumes
```

| URL | Service |
| --- | --- |
| https://biz.loc:9443 | Next.js web client |
| https://api.biz.loc:9443/v1/... | Express API |
| https://api.biz.loc:9443/v1/docs | Swagger UI |
| http://127.0.0.1:9082 | AdminNeo (MySQL) |
| http://127.0.0.1:18026 | Mailpit |

The API uses MySQL. On a fresh local stack, seed the legacy sample records with:

```bash
npm run local -- seed
```

The seed command creates the schema if needed and can be rerun to refresh its
sample records. It also creates `rob@seferdesign.com` with password
`example123` on first seed, with two-factor login disabled. For an existing
database, run `npm run local -- seed-user` to create or preserve only that
account without changing sample records. Existing accounts are never reset by
rerunning the seed. Production user seeding requires both
`ALLOW_PRODUCTION_SEED=true` and `SEED_USER_PASSWORD`. Use
`npm run local -- mysql` to open a MySQL client. Production `DATABASE_URL`
values must use the `mysql://` scheme.

To import a legacy live Rails/PostgreSQL dump into local MySQL, run:

```bash
npm run local -- import-live /absolute/path/to/dump.sql.gz
```

This command loads the dump into a temporary PostgreSQL container and then runs
the reconciliation importer that maps data into the current MySQL schema.

The web office requires sign-in with an existing user email and password;
accounts with two-factor login enabled also require their current code. The web
session is HttpOnly and expires after eight hours. The public web exceptions are
`/payment` and matching invoice/client access-token read links.
Use “Forgot your password?” on the sign-in page to request a six-hour, single-use
reset link by email. Signed-in users can change their password under
`/settings/password` after confirming their current password. Reset mail uses the
configured SMTP service and `PUBLIC_APP_URL`.

On an existing API database, run `npm run local -- db:setup` to add the users
table. Legacy user rows must be migrated before anyone can sign in; preserve the
Devise `encrypted_password` and encrypted OTP fields.

Protected API routes accept the signed user session or
`Authorization: Bearer <API_ACCESS_TOKEN>`. Local Compose uses
`local-development-api-token` unless overridden; cloud Compose requires a
secret `API_ACCESS_TOKEN`. Set `OTP_SECRET_ENCRYPTION_KEY` to the legacy
OTP encryption key when two-factor accounts are used. Health, OpenAPI, and docs
routes remain public; invoice/client links grant access only to matching reads.

Local Compose uses a development-only OTP encryption key by default so the web
setup flow is available. Override it with the legacy key when importing
users who already have two-factor authentication enabled.

The API hostname mirrors production: `api.biz.seferdesign.com` maps to
`api.biz.loc` locally. Because the client and API are separate origins, the API
only accepts browser requests from the hosts listed in `CORS_ALLOWED_ORIGINS`.

### Resource requirements

`next build` and the Turbopack dev compiler need roughly 2 GB on their own. Give
the Docker VM at least 8 GB:

```bash
colima stop && colima start --cpu 4 --memory 8
```

### Layout

- `Dockerfile` — multi-stage build with `api-local`, `api-production`, `web-local`, and `web-production` targets.
- `docker-compose.yml` — shared build definitions extended by the local and cloud files.
- `docker-compose.local.yml` — nginx (TLS), API, web, MySQL, AdminNeo, Mailpit.
- `docker-compose.cloud.yml` — production image definitions.
- `build.env` — versions and ports shared by every compose file.
- `.env.sample` — copy to `.env` for secrets and cloud endpoints.
