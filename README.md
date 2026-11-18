# Instalabilidad Nativa y Acceso Ético a Cámara

**Tema 6.1 y 6.2 — Desarrollo de Aplicaciones Web Progresivas (PWA)**
**Alumno:** Juan José Díaz Barroso

PWA instalable (manifest.json + Service Worker Cache First) con acceso a la cámara mediante flujo de **Pre-Permiso (UX ética)**, alternancia entre cámara trasera (`environment`) y frontal (`user`) y liberación del sensor con `track.stop()`.

- JavaScript Vanilla, sin `async/await` ni librerías (solo `.then()`, `.catch()`, `.finally()`).
- Soporte iOS: `apple-touch-icon`, `<video autoplay playsinline muted>` e instrucciones manuales de instalación (`#instrucciones-ios`) cuando el dispositivo es iOS y no está en modo `standalone`.

## Estructura

```
├── index.html
├── styles.css
├── app.js
├── sw.js
├── manifest.json
└── icons/
    ├── icon-192.png
    └── icon-512.png
```
