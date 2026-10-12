## Learned User Preferences

- Stay on `master` for product work; ignore discovery and mockup branches unless explicitly asked to use them.
- Prefer the user’s confirmed Unraid `docker build` / `docker run` flow over `docker compose` for deploying WebMiniDisc on their server.

## Learned Workspace Facts

- Default git branch is `master` (not `main`).
- Local WebUSB testing needs HTTPS; Vite uses `@vitejs/plugin-basic-ssl` at `https://localhost:5173` (accept the self-signed cert).
- Production container serves HTTPS on port `8474`; the MiniDisc must be plugged into the browser machine, not the Unraid host.
- Confirmed Unraid deploy: `docker build -t webminidisc:latest .`, then replace container `WebMiniDisc` with `docker run -d --name WebMiniDisc --restart unless-stopped -p 8474:8474` plus `DOWNTIFY_UPSTREAM`/`MD_LIBRARY_UPSTREAM`/`DATABASE_URL`/`AUDIO_DIR` env and mounts `/mnt/user/media/Music:/downloads`, `/mnt/user/appdata/webminidisc-downtify:/data`, `/mnt/user/appdata/webminidisc-library:/md-library-data`.
