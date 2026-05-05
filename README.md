# Grafana data source plugin template

This template is a starting point for building a Data Source Plugin for Grafana.

## What are Grafana data source plugins?

Grafana supports a wide range of data sources, including Prometheus, MySQL, and even Datadog. There’s a good chance you can already visualize metrics from the systems you have set up. In some cases, though, you already have an in-house metrics solution that you’d like to add to your Grafana dashboards. Grafana Data Source Plugins enables integrating such solutions with Grafana.

## Getting started

### Theia-Specific info

1. Install golang

https://go.dev/doc/install

2. Install Mage

https://magefile.org

3. Do a clean build

n.b. this only builds the linux x64 and linux arm64 binaries for the
backend, since that's what we ship Theiascope on - in the long run
we'll want to just change the two `mage` lines to a single `mage -v`
invocation, which will build windows and macos binaries as well.

```bash
rm -rf dist
npm run build
mage -v build:linux
mage -v build:linuxARM64
```

4. Sign the plugin

pls don't leak this!!  this is my precious token

```bash
export GRAFANA_ACCESS_POLICY_TOKEN=glc_eyJvIjoiMTY1NzYyNCIsIm4iOiJwbHVnaW4tc2lnbmluZy1ob25rIiwiayI6IlZ3OERFZjZQcW81RDgwME1KOE9RbzQ1NCIsIm0iOnsiciI6InVzIn19
npx @grafana/sign-plugin@latest --rootUrls https://localhost/,http://localhost:3000/
```

5. Install the updated plugin into our Grafana

Take note!  If your Grafana checkout isn't in a folder named 'grafana' in a sibling
directory to this one, update the PATH_TO_THEIA_GRAFANA_CHECKOUT variable below.

```bash
export PATH_TO_THEIA_GRAFANA_CHECKOUT=../grafana
rm -rf ${PATH_TO_THEIA_GRAFANA_CHECKOUT}/src/theiascientific-jupyter-datasource
cp -rp dist ${PATH_TO_THEIA_GRAFANA_CHECKOUT}/src/theiascientific-jupyter-datasource
```

6. run `npm build` and then `npm start` in the Grafana repo

### Backend

1. Update [Grafana plugin SDK for Go](https://grafana.com/developers/plugin-tools/key-concepts/backend-plugins/grafana-plugin-sdk-for-go) dependency to the latest minor version:

   ```bash
   go get -u github.com/grafana/grafana-plugin-sdk-go
   go mod tidy
   ```

2. Build plugin backend binaries for Linux, Windows and Darwin:

   ```bash
   mage -v
   ```

3. List all available Mage targets for additional commands:

   ```bash
   mage -l
   ```

### Frontend

1. Install dependencies

   ```bash
   npm install
   ```

2. Build plugin in development mode and run in watch mode

   ```bash
   npm run dev
   ```

3. Build plugin in production mode

   ```bash
   npm run build
   ```

4. Run the tests (using Jest)

   ```bash
   # Runs the tests and watches for changes, requires git init first
   npm run test

   # Exits after running all the tests
   npm run test:ci
   ```

5. Spin up a Grafana instance and run the plugin inside it (using Docker)

   ```bash
   npm run server
   ```

6. Run the E2E tests (using Playwright)

   ```bash
   # Spins up a Grafana instance first that we tests against
   npm run server

   # If you wish to start a certain Grafana version. If not specified will use latest by default
   GRAFANA_VERSION=11.3.0 npm run server

   # Starts the tests
   npm run e2e
   ```

7. Run the linter

   ```bash
   npm run lint

   # or

   npm run lint:fix
   ```

# Distributing your plugin

When distributing a Grafana plugin either within the community or privately the plugin must be signed so the Grafana application can verify its authenticity. This can be done with the `@grafana/sign-plugin` package.

_Note: It's not necessary to sign a plugin during development. The docker development environment that is scaffolded with `@grafana/create-plugin` caters for running the plugin without a signature._

## Initial steps

Before signing a plugin please read the Grafana [plugin publishing and signing criteria](https://grafana.com/legal/plugins/#plugin-publishing-and-signing-criteria) documentation carefully.

`@grafana/create-plugin` has added the necessary commands and workflows to make signing and distributing a plugin via the grafana plugins catalog as straightforward as possible.

Before signing a plugin for the first time please consult the Grafana [plugin signature levels](https://grafana.com/legal/plugins/#what-are-the-different-classifications-of-plugins) documentation to understand the differences between the types of signature level.

1. Create a [Grafana Cloud account](https://grafana.com/signup).
2. Make sure that the first part of the plugin ID matches the slug of your Grafana Cloud account.
   - _You can find the plugin ID in the `plugin.json` file inside your plugin directory. For example, if your account slug is `acmecorp`, you need to prefix the plugin ID with `acmecorp-`._
3. Create a Grafana Cloud API key with the `PluginPublisher` role.
4. Keep a record of this API key as it will be required for signing a plugin

## Signing a plugin

### Using Github actions release workflow

If the plugin is using the github actions supplied with `@grafana/create-plugin` signing a plugin is included out of the box. The [release workflow](./.github/workflows/release.yml) can prepare everything to make submitting your plugin to Grafana as easy as possible. Before being able to sign the plugin however a secret needs adding to the Github repository.

1. Please navigate to "settings > secrets > actions" within your repo to create secrets.
2. Click "New repository secret"
3. Name the secret "GRAFANA_API_KEY"
4. Paste your Grafana Cloud API key in the Secret field
5. Click "Add secret"

#### Push a version tag

To trigger the workflow we need to push a version tag to github. This can be achieved with the following steps:

1. Run `npm version <major|minor|patch>`
2. Run `git push origin main --follow-tags`

## Learn more

Below you can find source code for existing app plugins and other related documentation.

- [Basic data source plugin example](https://github.com/grafana/grafana-plugin-examples/tree/master/examples/datasource-basic#readme)
- [`plugin.json` documentation](https://grafana.com/developers/plugin-tools/reference/plugin-json)
- [How to sign a plugin?](https://grafana.com/developers/plugin-tools/publish-a-plugin/sign-a-plugin)

### Development

- Create a .env file (can be empty, or copy from .env.example)
- `npm run dev` to watch/compile the .ts
- `npm run start` to run the nginx/system/jupyter/grafana stack
- if you make golang changes: `mage -v build:linux && docker compose restart grafana`
- If at some point you sign the token (e.g. via the instructions above to sign and
  install it in theia-grafana), subsequent debug builds will not be recognized. At
  this point you'll want to nuke the dist/ folder and rebuild/restart.
