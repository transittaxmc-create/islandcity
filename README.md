# 🚕 IslandCity — Tip Tracker · Driver Accounting

## ▶️ LA APP EN VIVO: https://transittaxmc-create.github.io/islandcity/

> PWA para el teléfono — se puede instalar ("Añadir a inicio") y funciona offline.
> Los datos se guardan en el dispositivo; para pasarlos de teléfono ↔ PC usa
> **DASH → BACKUP / RESTORE** (EXPORT en uno, IMPORT en el otro).

---

## 📂 ¿Cuál carpeta es la app?

| Carpeta | Qué es |
|---|---|
| **`artifacts/islandcity-driver-accounting/`** | ⭐ **LA APP** (React + Vite). Pantallas en `src/screens/`, lógica en `src/lib/`, datos offline en `src/lib/storage.ts` |
| `.github/workflows/` | Deploy automático a GitHub Pages en cada push a `main` |
| `.agents/memory/` | Spec maestra, plan del proyecto y decisiones de diseño |
| `screenshots/` | Capturas de la app |
| `attached_assets/`, `lib/`, `scripts/` | Materiales de referencia y soporte |

*(carpetas como `node_modules/` o `dist/` no se ven en GitHub — son locales)*

---

## 🔗 Cómo abrir la app desde GitHub

1. **Directo:** https://transittaxmc-create.github.io/islandcity/ (guárdalo en favoritos)
2. **Desde el repo:** en la página principal, barra lateral derecha → **Environments** → **github-pages** → **View deployment**
3. **Desde Actions:** pestaña **Actions** → el último run con ✅ verde → abajo en *Deployments* → **github-pages / View deployment**

## ▲ Vercel (segundo link en vivo)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ftransittaxmc-create%2Fislandcity)

La configuración de build ya está lista en `vercel.json` (instala el monorepo pnpm y compila `artifacts/islandcity-driver-accounting`).
Cada push a `main` → deploy de producción · cada push a `feature/*` → preview URL.

## 🚀 Cómo se despliega

Cada push a `main` dispara el workflow `deploy-driver-accounting.yml`:
compila la app (`artifacts/islandcity-driver-accounting`) y la publica en Pages.
Branch de desarrollo: `feature/port-v2` (se sincroniza con `main` en cada hito).
