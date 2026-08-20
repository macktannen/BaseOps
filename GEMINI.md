# BaseOps Project Rules

Include all directives specified in AGENTS.md.

1. **Version Control**: Every change requires a version bump in `src/App.tsx` (`APP_VERSION`).
2. **Changelog**: Every change requires an update to `CHANGELOG.md`.
3. **Data Sync**: Maintain cross-tab/cross-port sync via `dataSyncService.js`.
4. **Git Push**: Every change must be committed and pushed to `git push origin main`.
