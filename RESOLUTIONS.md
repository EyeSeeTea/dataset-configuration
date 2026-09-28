# Yarn Resolutions

This file documents every entry in the `resolutions` block of `package.json`. Each entry should answer three questions: **what is being pinned**, **why it exists**, and **when it can be removed**.

`package.json` doesn't allow comments, so this file is the only place that knowledge lives. **If you add or remove a resolution, update this file in the same commit.**

## Conventions

-   **Only add a resolution when the fix is outside the range the parent declares.** When the patched version already satisfies the parent's range, refresh the lockfile instead: delete the stale `yarn.lock` entry and run `yarn install`, which re-resolves it to the newest matching release. A resolution for an in-range fix is a permanent pin with nothing to gain.
-   **A resolution is a floor, so it takes a `^` range.** A newer patch landing is strictly better. It has to name the version that fixes every advisory it covers: take the highest patched version across all of them, not the first one found.
-   **This repository is on Yarn Classic (1.22), not Yarn 4 like dhis2-app-skeleton.** Resolution syntax does not carry over unchanged:
    -   Only two forms bind reliably: a bare package name (global override, every occurrence) and `parent/child`.
    -   **`parent/child` silently fails when the parent is not a root-level dependency.** It needs a `**/parent/child` wildcard prefix instead. `styled-components/postcss` binds without it because `styled-components` is a direct dependency.
    -   **A scoped entry that binds to nothing produces no warning.** Always confirm with `yarn why <pkg>` after installing: a successful `yarn install` proves nothing about whether the entry applied.
-   **An override can force a parent past the range it declares.** That is a compatibility override, not a free action: each entry that does so names the consumer code path that was checked.
-   **`yarn audit` and GitHub/Dependabot disagree.** They score against different advisory sources, so use `yarn audit` as a directional signal and confirm what is really open against the Dependabot alerts.

---

## Active resolutions

### Runtime packages

#### `axios: ^1.18.0`

-   **Why:** `@eyeseetea/d2-api@1.21.0-beta.2` requests `axios` at exactly `1.6.4`, so without the pin it can never move. `axios` is in the browser bundle because `d2-api` imports its axios backend statically, but the application itself uses the `fetch` backend (`src/types/d2-api.ts`); axios is the backend only for scripts that pass `backend: "xhr"` (`src/scripts/move-old-projects.ts`). Both backends were exercised against a local server (`GET` with `fields`/`filter` params, `POST /metadata` with a body, `api.models.dataSets.get`), and the requests they send are byte-identical to the ones sent with 1.6.4. Resolves to 1.20.0.
-   **Fixes:** GHSA-hfxv-24rg-xrqf, GHSA-p92q-9vqr-4j8v, GHSA-j5f8-grm9-p9fc, GHSA-3g43-6gmg-66jw, GHSA-35jp-ww65-95wh, GHSA-pf86-5x62-jrwf, GHSA-6chq-wfr3-2hj9, GHSA-pmwg-cvhr-8vh7, GHSA-q8qp-cvcw-x6jj, GHSA-43fc-jf86-j433, GHSA-4hjh-wcwx-xvwj, GHSA-jr5f-v2jv-69x6, GHSA-8hc4-vh64-cxmj (13 high) plus 15 medium and 1 low.
-   **Drop when:** `@eyeseetea/d2-api` requests `axios >= 1.18.0` natively.

#### `qs: ^6.16.0`

-   **Why:** `@eyeseetea/d2-api` requests `qs` at exactly `6.9.7` and uses it to serialize every query string in both backends. Also lifts the `url` polyfill's copy (`^6.11.2`), which a lockfile refresh would have reached on its own. Verified with the same local-server requests as `axios` above: identical query strings, including repeated `filter` params and `in:[...]` filters.
-   **Fixes:** GHSA-4mjr-xmp4-gh2g, GHSA-q8mj-m7cp-5q26, GHSA-6rw7-vpxm-498p (medium); GHSA-w7fw-mjwx-w883 (low).
-   **Drop when:** `@eyeseetea/d2-api` requests `qs >= 6.16.0` natively.

#### `lodash: ^4.18.1`

-   **Why:** `@eyeseetea/d2-api@1.21.0-beta.2` and `@eyeseetea/d2-ui-components@2.13.0-beta.5` both request `lodash` at exactly `4.17.21`. The direct dependency was also moved from `4.17.21` to `^4.18.1`, but that alone does not lift the copies those two libraries request. Every other consumer asks for a range 4.18.x satisfies, so the tree holds a single 4.18.1. The floor is 4.18.1, not 4.18.0: npm deprecates 4.18.0 as a bad release.
-   **Fixes:** GHSA-r5fr-rjxr-66jc (high); GHSA-f23m-r3pf-42rh, GHSA-xxjr-mmjv-4gpg (medium).
-   **Drop when:** `@eyeseetea/d2-api` and `@eyeseetea/d2-ui-components` both stop pinning lodash exactly. Remove it only if `yarn why lodash` shows nothing but 4.18.x without it.

#### `**/react-linkify/linkify-it: ^5.0.2`

-   **Why:** `@eyeseetea/d2-ui-components → react-linkify@1.0.0-alpha` requests `linkify-it@^2.0.3`, and the 2.x line has no fix; `react-linkify` is unmaintained, so there is no parent upgrade to take. Checked here, not only copied from dhis2-app-skeleton: react-linkify's default match decorator still finds URLs, `www.` hosts and e-mail addresses, and rendering `<Linkify>` produces the expected `<a href>`. Needs the `**/` prefix because `react-linkify` is not a root-level dependency (see "Rejected pins").
-   **Fixes:** GHSA-v245-v573-v5vm, GHSA-22p9-wv53-3rq4 (high): quadratic-complexity DoS.
-   **Drop when:** `@eyeseetea/d2-ui-components` drops or replaces `react-linkify`.

#### `node-fetch: ^2.6.7`

-   **Why:** `d2@31.10.2` and `@eyeseetea/d2-ui-components → @dhis2/d2-ui-core → d2@31.7.0` reach `isomorphic-fetch@2.2.1`, which requests `node-fetch@^1.0.1`; the fix is on 2.6.7, which that range cannot reach. Has to stay a range so `cross-fetch@4` (`^2.6.12`) is not held below its own range. This **forces `isomorphic-fetch` across a major**; its Node entry only calls `realFetch(url, options)` and re-exports `Response`, `Headers` and `Request`, all still exported by node-fetch 2, and a request through it against a local server returns the expected response. Not in the browser bundle: `isomorphic-fetch` maps to `whatwg-fetch` there. Resolves to 2.7.0.
-   **Fixes:** GHSA-r683-j2x4-v87g (high): secure headers forwarded across a cross-host redirect.
-   **Drop when:** the `^1.0.1` consumer leaves the tree. Verify with `yarn why node-fetch`.

### Build tooling: never reaches the browser bundle

#### `**/i18next-conv/node-gettext: ^3.0.1`

-   **Why:** `@dhis2/d2-i18n-extract@1.0.8` and `@dhis2/d2-i18n-generate@1.2.0` both use `i18next-conv@6.1.1`, which requests `node-gettext: ^2.0.0`. The advisory records no patched version, but its affected range is `<= 3.0.0` and 3.0.1 is published outside it. Verified with `yarn localize` (`extract-pot`, `msgmerge` and `d2-i18n-generate`, the scripts that call this code path): `i18n/en.pot` and every generated file in `src/locales/` are byte-identical to the output with 2.1.0.
-   **Fixes:** GHSA-g974-hxvm-x689 (high): prototype pollution.
-   **Drop when:** `i18next-conv` requests `node-gettext >= 3.0.1` natively, or the i18n tooling moves to `@dhis2/cli-app-scripts` and `@dhis2/d2-i18n-extract`/`d2-i18n-generate` leave the tree.

#### `styled-components/postcss: ^8.5.23`

-   **Why:** `styled-components@6.1.11` requests `postcss` at exactly `8.4.38`, but never loads it: nothing in its `dist/` references `postcss`, so the pin only replaces a copy that is installed and never executed. Upgrading `styled-components` itself would have been the cleaner fix (6.5.x no longer depends on `postcss`), but it changes the runtime styling library used by 19 source files, where this entry changes nothing that runs.
-   **Fixes:** GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849 (high); GHSA-qx2v-qp2m-jg93, GHSA-fxqj-rqcc-2cmp (medium).
-   **Drop when:** `styled-components` is upgraded to a release that no longer depends on `postcss`, or requests `postcss >= 8.5.23` natively.

---

## Rejected pins

Tried, verified not to work, and replaced. Recorded so nobody re-tries them.

| Pin attempted                                | What happened                                                                                                                                                                                                           |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `react-linkify/linkify-it` (no `**/` prefix) | Installed successfully and changed nothing: `linkify-it@2.2.0` stayed in the tree. Yarn Classic does not bind a `parent/child` entry when the parent is not a root-level dependency. Use `**/react-linkify/linkify-it`. |

---

## Known findings with no fix available

#### `elliptic@6.6.1`: GHSA-848j-6mx2-7j84

-   **Chain:** `vite-plugin-node-stdlib-browser` → `node-stdlib-browser` → `crypto-browserify` → `browserify-sign` and `create-ecdh`.
-   **Why it cannot be fixed:** the advisory covers **all versions `<= 6.6.1`**, and 6.6.1 is the latest published release. Every other `elliptic` advisory is closed at this version.
-   **Impact:** low severity, and the ECDSA code path is only reachable through the Node polyfills `vite.config.ts` injects.
-   **Drop when:** `elliptic` publishes a fix, or the polyfill chain leaves the tree.

## Known findings requiring the vite/vitest migration

`vitest@0.32.4` declares `vite: ^3.0.0 || ^4.0.0`, and `vite-plugin-node-stdlib-browser@0.2.1`, its latest release, declares the same upper bound. Every remaining vite fix is on 5.x or 6.x, so none of these can be closed without moving vite, vitest and the polyfill plugin together.

-   **`vite@4.5.14`**: GHSA-fx2h-pf6j-xcff, GHSA-c27g-q93r-2cwf (high); GHSA-v6wh-96g9-6wx3, GHSA-4w7w-66w2-5vf9, GHSA-93m4-6634-74q7 (medium); GHSA-g4jq-h2w9-997c, GHSA-jqfw-vq24-v9c3 (low). Development server only. GHSA-93m4-6634-74q7 affects `>= 4.5.3, < 5.0.0`: the refresh from 4.4.9 to 4.5.14 that closed thirteen older vite advisories brought it into range, and it is Windows-only.
-   **`vitest@0.32.4`**: GHSA-5xrq-8626-4rwp (critical). Only reachable while the Vitest UI server is listening; `@vitest/ui` is not installed here.
-   **`esbuild@0.18.20`** (via `vite@4`): GHSA-67mh-4wv8-2f99 (medium). Development server only.
