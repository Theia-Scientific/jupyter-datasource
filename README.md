# Grafana data source plugin template

This template is a starting point for building a Data Source Plugin for Grafana.

## What are Grafana data source plugins?

Grafana supports a wide range of data sources, including Prometheus, MySQL, and even Datadog. There’s a good chance you can already visualize metrics from the systems you have set up. In some cases, though, you already have an in-house metrics solution that you’d like to add to your Grafana dashboards. Grafana Data Source Plugins enables integrating such solutions with Grafana.

## Getting started

### Theia-Specific info

1. Install pnpm

We use pnpm instead of npm for additional performance and security.

https://pnpm.io/installation

2. pnpm install

Install dependent node modules using pnpm:

```bash
pnpm install
```

3. Install golang

https://go.dev/doc/install

4. Install Mage

https://magefile.org

5. Do a clean build

n.b. this only builds the linux x64 and linux arm64 binaries for the
backend, since that's what we ship Theiascope on - in the long run
we'll want to just change the two `mage` lines to a single `mage -v`
invocation, which will build windows and macos binaries as well.

```bash
rm -rf dist
pnpm run build
mage -v build:linux
mage -v build:linuxARM64
```

6. Updating `theia-grafana`

The plugin will be built and signed by CI on commits to main, and the CI action will upload
a build artifact.  Take that build artifact and unzip it; its contents should go in
`theia-grafana/src/theiascientific-jupyter-datasource`.

7. run `npm run build` and `npm run start` in the Grafana repo

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
   pnpm install
   ```

2. Build plugin in development mode and run in watch mode

   ```bash
   pnpm run dev
   ```

3. Build plugin in production mode

   ```bash
   pnpm run build
   ```

4. Run the tests (using Jest)

   ```bash
   # Runs the tests and watches for changes, requires git init first
   pnpm run test

   # Exits after running all the tests
   pnpm run test:ci
   ```

5. Spin up a Grafana instance and run the plugin inside it (using Docker)

   ```bash
   pnpm run start
   ```

6. Run the E2E tests (using Playwright)

   ```bash
   # Spins up a Grafana instance first that we tests against
   pnpm run server

   # If you wish to start a certain Grafana version. If not specified will use latest by default
   GRAFANA_VERSION=11.3.0 pnpm run server

   # Starts the tests
   pnpm run e2e
   ```

7. Run the linter

   ```bash
   pnpm run lint

   # or

   pnpm run lint:fix
   ```

### Development

- Run `pnpm run dev` in one terminal to watch/compile the .ts.
- In another terminal, `pnpm run server` to run a grafana server with this plugin in it.
- if you make golang changes: `pnpm run restart` (will compile and restart the server)
- If at some point you sign the token (e.g. via the instructions above to sign and
  install it elsewhere), subsequent debug builds will not be recognized. At
  this point you'll want to nuke the dist/ folder and rebuild/restart.

### Running backend tests

- Just run `mage test` generally.
- For updating mocks: `go install github.com/vektra/mockery/v3@v3.7.0`
  and then run `mockery` in the root of the repo.

### Testing

Ensure the following system dependencies are installed on the host test machine.

- [Docker]
- [Docker Compose]
- [git]
- [Go Programming Language], aka "golang"
- [Mage]
- [NodeJS]

1. Clone this repository and change directory to the root project directory for
   the data source.

   ```sh
   git clone https://github.com/Theia-Scientific/jupyter-datasource.git && cd jupyter-datasource
   ```

2. Install frontend, [NodeJS], dependencies.

   ```sh
   pnpm install
   ```

3. Add a `JUPYTER_TOKEN` to the `.env` file. The value of the environment
   variable can be anything, but it must exist so that Grafana can communicate
   with the Jupyter instance.
   
   ```sh
   echo "JUPYTER_TOKEN=abcdefghijklmnopqrstuvwxyz0123456789" >> .env
   ```

4. Checkout the appropriate branch for a Pull Request (PR) to test:

   ```sh
   git checkout <feature-branch-name>
   ```
   
   where `<feature-branch-name>` is replaced with the name of the git branch.

5. Build all components.

   ```sh
   pnpm run build:all
   ```
   
   Instead of using the [PNPM] [script], the individual commands can be executed
   from a shell terminal.
   
   1. Build the NodeJS frontend.
   
      ```sh
      webpack -c ./webpack.config.ts --env production 
      ```
      
   2. Build the Golang backend.
  
      ```sh
      mage -v
      ```
      
6. Build and start the Grafana and Jupyter containers.

   ```sh
   pnpm run start
   ```
   
   or
   
   ```sh
   docker compose up --build
   ```

7. Open a web browser and navigate to <http://localhost:8888>. Enter the
   `JUPYTER_TOKEN` in the `.env` file from earlier in the form field.
   
8. Open another tab in the web browser and navigate to <http://localhost:3000>
   to access Grafana.
   
9. Test the data source by navigating to the Jupyter data source under the
   "Connections" menu within the Grafana web browser tab, and click on the "Save
   & test" button.
   
10. Click on the "building a dashboard" link and add a visualization.

11. Select the "Jupyter" data source for the query source in the query editor
    section of the visualization. The default query should already be filled in.
    
12. Click "Refresh" to test the execution of the default query. Two sine waves
    should appear.

13. Once done testing the branch, return to the terminal press `CTRL+C` to stop
    the containers. Alternatively, another terminal can be opened and the
    following command could be used:

    ```sh
    pnpm run stop
    ```
    
    or

    ```sh
    docker compose down
    ```

[docker]: https://www.docker.com/
[docker compose]: https://docs.docker.com/compose/
[git]: https://git-scm.com/
[go programming language]: https://go.dev/
[mage]: https://magefile.org/
[nodejs]: https://nodejs.org/en
[pnpm]: https://pnpm.io/
[script]: https://docs.npmjs.com/cli/v8/using-npm/scripts
