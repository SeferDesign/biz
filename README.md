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
| https://api.biz.loc:9443/docs | Swagger UI |
| http://127.0.0.1:9082 | AdminNeo (MySQL) |
| http://127.0.0.1:18026 | Mailpit |

The API uses MySQL. On a fresh local stack, seed the legacy sample records with:

```bash
npm run local -- seed
```

The seed command creates the schema if needed and can be rerun to refresh its
sample records. Use `npm run local -- mysql` to open a MySQL client. Production
`DATABASE_URL` values must use the `mysql://` scheme.

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
