# 01 · NativeWind v5 setup

Status: done

## Goal
Screens can be styled with Tailwind `className` props through NativeWind v5 (RC0) on iOS, Android, and web.

## Decisions
- Source: https://www.nativewind.dev/v5/llms-full.txt ("Installation with Expo"). It targets `nativewind@5.0.0-rc.0` + `react-native-css@3.1.0-rc.0`, tested with Expo 57.0.22, RN 0.86.3, React 19.2.3, Reanimated 4.5.1, Worklets 0.10.1. Those match this project.
- Pin exact versions (RC pair must match): `nativewind@5.0.0-rc.0`, `react-native-css@3.1.0-rc.0`; dev: `tailwindcss@4.1.12`, `@tailwindcss/postcss@4.1.12`, `postcss`, `lightningcss@1.30.1`.
- Install through `npx expo install <pkgs> -- --save-exact` (and `-- --save-dev --save-exact` for dev deps), per the AGENTS.md rule.
- Add `"overrides": { "lightningcss": "1.30.1" }` to `package.json` (npm) to avoid `global.css` deserialization errors.
- Reanimated, Worklets, safe-area-context, and expo-system-ui are already installed at SDK versions. Run `npx expo install` on them only to confirm alignment.
- CSS lives at `src/global.css` (outside `src/app/`, which holds routes only) and is imported once in `src/app/_layout.tsx`.
- PostCSS config is `postcss.config.mjs` (Expo 57 does not discover `.cjs`).
- No `babel.config.js` is needed: the Metro integration applies the import rewrite (`globalClassNamePolyfill` default `true`).
- TypeScript: commit the generated `nativewind-env.d.ts` (`/// <reference types="react-native-css/types" />`). It is covered by the tsconfig `**/*.ts` include.
- Dark mode uses the system `prefers-color-scheme` via `dark:`. `app.json` already has `"userInterfaceStyle": "automatic"`.
- Smoke test: convert `src/app/index.tsx` from `StyleSheet` to `className`.

## Out of scope
- Design tokens/theme (`@theme` in `global.css`). That comes with the design system, derived from the designs.
- `prettier-plugin-tailwindcss` (optional in the doc; not adding a dependency without need).
- Manual theme toggle and runtime CSS variables.

## Steps
### 1. Install dependencies
`npx expo install nativewind@5.0.0-rc.0 react-native-css@3.1.0-rc.0 -- --save-exact`, then `npx expo install tailwindcss@4.1.12 @tailwindcss/postcss@4.1.12 postcss lightningcss@1.30.1 -- --save-dev --save-exact`. Add the `lightningcss` override to `package.json` and reinstall. Done when `npm ls lightningcss` shows only 1.30.1.

### 2. Tailwind + PostCSS
Create `postcss.config.mjs` with `plugins: { "@tailwindcss/postcss": {} }`. Create `src/global.css`:
```css
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css";

@import "nativewind/theme";
```
Keep utilities unlayered (no single `@import "tailwindcss"`).

### 3. Metro
Create `metro.config.js`: `getDefaultConfig(__dirname)` from `expo/metro-config`, wrapped in `withNativewind` from `nativewind/metro`.

### 4. Import CSS + types
Add `import "../global.css";` at the top of `src/app/_layout.tsx`. Create `nativewind-env.d.ts` with the reference directive. If tsc complains about the CSS import, add `declare module "*.css";` to that file.

### 5. Smoke test
Rewrite `src/app/index.tsx` with `className="flex-1 items-center justify-center bg-white dark:bg-black"` and styled text, removing `StyleSheet`.

## Verification
- `npx expo lint`, `npx tsc --noEmit`, `npx expo-doctor` pass.
- `npx expo start --clear`, open on the iOS simulator, screenshot: text centered and styled with the Tailwind classes.
- Toggle simulator appearance (`xcrun simctl ui booted appearance dark`): background/text switch.

## AGENTS.md updates
- Expo section: "Styling is NativeWind v5 (`className`), Tailwind v4 CSS-first config in `src/global.css`. Keep `nativewind`/`react-native-css`/`tailwindcss`/`lightningcss` pinned to exact versions (RC pair must match). No `babel.config.js` for NativeWind; Metro's `withNativewind` handles it. Use `useColorScheme` from `react-native`, not `nativewind`."

## Result
Built as planned. `npx expo install` put the Tailwind build tools in `dependencies`, so they were moved to `devDependencies` by hand. Metro's NativeWind integration added `nativewind-env.d.ts` to `tsconfig.json` `include`. The first `npx expo lint` run created `eslint.config.js` and installed `eslint` + `eslint-config-expo`. Lint, tsc, and expo-doctor (18/18) pass. On the iOS simulator (Expo Go 57), `index.tsx` renders with `className` styles in light mode and switches with `dark:` in dark mode. The native Stack header does not follow dark mode yet (no navigation theme set); that is unrelated to NativeWind.
