# SoyAsesoriasAplicacionWeb — notas del proyecto

## Comandos

- `npm start` — dev server en http://localhost:3873 (`ng serve --no-hmr --port=3873`)
- `npm run build` — build de producción en `dist/fuse`
- **Importante**: Angular 22 requiere Node v22.22.3+. El sistema solo tiene
  v16 en el PATH; usar el Node portable:

  ```powershell
  $env:PATH = "C:\Users\skaca\node22\node-v22.22.3-win-x64;$env:PATH"
  node "C:\Users\skaca\node22\node-v22.22.3-win-x64\node_modules\npm\bin\npm-cli.js" run start
  node "C:\Users\skaca\node22\node-v22.22.3-win-x64\node_modules\npm\bin\npm-cli.js" run build
  ```

## Configuración externa (config.json)

- `public/config.json` se copia tal cual al build (`dist/fuse/browser/config.json`)
  y se carga en runtime antes del bootstrap (APP_INITIALIZER en `app.config.ts`).
- Permite cambiar el servidor de la API **sin recompilar**:

  ```json
  { "serverUrl": "http://localhost:3000/api" }
  ```

- Consumidores: `api-prefix.interceptor.ts` (requests HTTP) y
  `notifications.service.ts` (socket realtime).
- Si el archivo falta o falla la carga, se usa el fallback compilado en
  `src/environments/environment.ts` / `environment.prod.ts`.

## Notificaciones

- `src/app/core/notifications/notification-sound.ts` — sonido sintetizado
  con Web Audio API; tono (campana/ding/suave/pop) y volumen configurables
  por usuario (localStorage con prefijo por user id) desde el panel.
