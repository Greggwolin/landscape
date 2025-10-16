# Prototype Lab Workflow

This directory explains how to spin up temporary UI experiments without disturbing the core app. The goal is to
make it painless to explore new design systems (CoreUI, Tailwind marketing pages, MUI variants) across multiple
machines while keeping Git history tidy.

## Quick start

1. Visit `/prototypes` in the running Next.js app.
2. Pick a card to launch an experiment.
3. Add new prototypes under `src/prototypes/<area>/<Name>.tsx` and register them in `src/lib/prototypes/registry.ts`.
4. Map the `id` to a dynamic import in `src/lib/prototypes/loaders.tsx`.
5. Commit/push the branch when you are ready to share. The registry supports pointing to feature branches so
   unfinished experiments stay isolated.

## Branch and sync flow

- Create a branch per concept (e.g. `feature/coreui-prototype`).
- Push at the end of each session (`git push origin feature/...`). Your other workstation can resume by running
  `git fetch` followed by `git checkout <branch>`.
- If you need to park incomplete work, either keep it on the feature branch or push to a temporary `wip/...`
  branch.

## Directory layout

```
src/
  app/
    prototypes/        # Route + layout for viewing prototypes
      [prototypeId]/   # Dynamic page wrapper
  lib/
    prototypes/        # Registry metadata + dynamic loaders
  prototypes/          # Actual experiment components grouped by system
```

## Tips

- Add context (owner, notes, target branch) in the registry metadata so the `/prototypes` index stays useful.
- Use dedicated data mocks inside each prototype; keep them self-contained so they work even without backend
  services.
- Capture learnings in Markdown next to the prototype (`docs/prototypes/<experiment>.md`) if you want a written
  record before merging into the main product.
- To embed static HTML mockups, copy them into `public/prototypes` and load them through a small React wrapper (see `coreui-lease-input`). This keeps CDN links intact while integrating with the hub.
- Dynamic app flows can be embedded via iframe so reviewers can click through without leaving the hub (see `coreui-lease-react`).
- Use the per-tile note box on `/prototypes` to jot feedback; entries are timestamped and stored in `docs/prototypes/notes.log` so the history travels with Git.
