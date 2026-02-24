+# Game Wheel
+
+Spin-the-wheel React app for picking the next game. The admin view controls the wheel, while the join page lets everyone submit titles from their own device. All entries persist to a lightweight Node API so every screen stays in sync.
+
+## Getting Started
+
+```bash
+npm install
+# Runs the API (http://localhost:5174) and Vite dev server (http://localhost:5173)
+npm run dev:full
+```
+
+The combined script keeps both backend and frontend running. Prefer separate terminals? Start `npm run server` for the API and `npm run dev` for Vite.
+
+### Accessing From Other Devices
+
+1. Put your computer and phones/tablets on the same network.
+2. Start the backend with `npm run server`.
+3. From another device, visit `http://<your-computer-ip>:5174/games` to verify connectivity.
+4. Launch `npm run dev` and open `http://<your-computer-ip>:5173/admin` for the wheel; share `/join` so players can submit games.
+
+### Environment Configuration
+
+If you deploy the API elsewhere, point the frontend at it with a `.env` file:
+
+```
+VITE_API_BASE_URL=https://your-domain-or-ip:5174
+```
+
+### Building for Production
+
+```bash
+npm run build
+```
+
+Serve the `dist/` folder with your preferred static host and run the Node server (`npm run server`) to provide the shared game storage. The admin page (`/admin`) listens for real-time updates from the API; `/join` is the submission view for players.
