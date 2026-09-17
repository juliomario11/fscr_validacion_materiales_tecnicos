#!/bin/bash
# =============================================================================
# deploy.sh — despliegue local (Ubuntu + pm2) de fscr_validacion_materiales_tecnicos
# -----------------------------------------------------------------------------
#   Mismo patrón que fscr_proveedores_factura/deploy.sh, en el mismo servidor
#   (factproveedores, vía Tailscale) -- ese proyecto corre en :9100, este en
#   :8082, cada uno con su propio proceso pm2 y su propio vhost de Apache2
#   (Apache no se versiona aquí, vive en /etc/apache2 del servidor).
#
#   Flujo:
#     1. Trae los últimos cambios de origin/main
#     2. Alinea el working tree
#     3. Compila apps/api (NestJS) y apps/web-angular (Angular) vía `npm run build`
#     4. Reinicia pm2 con ecosystem.config.js (que carga apps/api/.env)
#
#   Prerequisitos:
#     - Node.js 22.x + npm 10+ instalados
#     - pm2 instalado globalmente: npm install -g pm2
#     - apps/api/.env configurado (ver apps/api/.env.example), con
#       FSCR_API_PORT=8082 y FSCR_SERVE_STATIC=true (Node sirve los
#       estáticos de Angular -- no hace falta vhost aparte para el frontend)
#
#   Uso:
#     chmod +x deploy.sh   (solo la primera vez)
#     ./deploy.sh
# =============================================================================
set -e
cd "$(dirname "$0")"

BRANCH="main"

# Trae los últimos cambios del remoto.
git fetch origin

# Posiciona el working tree en la rama main, alineada con origin/main.
# Si hay cambios locales sin commitear, fallará (comitea primero si es el caso).
git checkout -B "$BRANCH" "origin/$BRANCH"

echo "📍 Rama: $BRANCH"
echo "📝 HEAD: $(git log -1 --oneline)"
echo ""

echo "🔨 Compilando API y frontend..."
npm run build

echo ""
echo "✅ Build completado"
echo ""
echo "🔄 Reiniciando pm2..."
pm2 startOrRestart ecosystem.config.js
pm2 save

echo "✅ Deploy completado en $(date)"
echo "   Procesos activos: $(pm2 list --nostream | grep 'online' | wc -l)"
