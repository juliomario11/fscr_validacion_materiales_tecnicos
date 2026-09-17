#!/usr/bin/env bash
# Despliegue de fscr_validacion_materiales_tecnicos en factproveedores
# (puerto publico 8082 via Apache -- mismo patron que sgi.conf: VirtualHost
# dedicado, sin tocar fscr_proveedores.conf ni sgi.conf. pm2 escucha
# internamente en 18082; Apache le hace ProxyPass /api ahi y sirve el
# DocumentRoot de Angular directamente, igual que ya hace con facturas.)
# Ejecutar en el servidor: ssh fscradmin@100.74.71.100, luego bash deploy.sh
set -euo pipefail

APP_DIR="/home/fscradmin/fscr_validacion_materiales_tecnicos"
VHOST_FILE="/etc/apache2/sites-available/fscr-validacion-materiales.conf"
PUBLIC_PORT=8082
INTERNAL_PORT=18082

if [ "$(id -u)" -eq 0 ]; then
  echo "ERROR: no ejecutes este script con 'sudo'. Solo los pasos de Apache piden sudo internamente."
  echo "Ejecuta: bash deploy.sh"
  exit 1
fi

cd "$APP_DIR"

echo "== 1/8 Trayendo ultima version =="
git fetch origin
git checkout -B main origin/main

echo "== 2/8 Verificando apps/api/.env =="
if [ ! -f apps/api/.env ]; then
  echo "ERROR: falta apps/api/.env (copialo de apps/api/.env.example y completa Supabase + SESSION_SECRET)."
  echo "FSCR_API_PORT debe valer $INTERNAL_PORT (puerto interno -- Apache expone $PUBLIC_PORT al publico)."
  exit 1
fi
if ! grep -q "^FSCR_API_PORT=$INTERNAL_PORT" apps/api/.env; then
  echo "AVISO: apps/api/.env no tiene FSCR_API_PORT=$INTERNAL_PORT -- revisa que coincida con el ProxyPass del vhost."
fi

echo "== 3/8 Instalando dependencias y compilando (API + Angular) =="
npm run build

echo "== 4/8 Verificando pm2 instalado =="
if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 no esta instalado globalmente. Instalalo con: npm install -g pm2"
  exit 1
fi

echo "== 5/8 Reiniciando proceso pm2 (fscr-validacion-materiales-api) =="
# pm2 delete + start (no startOrRestart/reload): si el .env cambia,
# startOrRestart reutiliza el env con el que el proceso se creo la primera
# vez y NO relee env_file -- solo un start limpio garantiza que tome el
# .env actual. Silenciar el error si el proceso no existia aun.
pm2 delete fscr-validacion-materiales-api >/dev/null 2>&1 || true
pm2 start ecosystem.config.js
pm2 save

echo "== 6/8 Asegurando que Apache escuche en el puerto $PUBLIC_PORT =="
if ! grep -q "^Listen $PUBLIC_PORT" /etc/apache2/ports.conf; then
  echo "Listen $PUBLIC_PORT" | sudo tee -a /etc/apache2/ports.conf
else
  echo "Puerto $PUBLIC_PORT ya estaba en ports.conf, no se toca."
fi

echo "== 7/8 Creando VirtualHost dedicado (sin tocar fscr_proveedores.conf ni sgi.conf) =="
if [ -f "$VHOST_FILE" ]; then
  echo "AVISO: $VHOST_FILE ya existe, no se sobrescribe. Revisalo manualmente si es necesario."
else
  sudo tee "$VHOST_FILE" > /dev/null <<EOF
<VirtualHost *:$PUBLIC_PORT>
    ServerName validacion-materiales.factproveedores
    DocumentRoot $APP_DIR/apps/web-angular/dist/web-angular/browser

    # Proxy para API de NestJS (pm2, puerto interno $INTERNAL_PORT -- no
    # confundir con el $PUBLIC_PORT publico de este VirtualHost)
    ProxyPreserveHost On
    ProxyRequests Off
    ProxyPass /api http://localhost:$INTERNAL_PORT/api
    ProxyPassReverse /api http://localhost:$INTERNAL_PORT/api

    # Servir archivos estaticos de Angular
    <Directory $APP_DIR/apps/web-angular/dist/web-angular/browser>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted

        # Angular routing
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html\$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    ErrorLog \${APACHE_LOG_DIR}/fscr_validacion_materiales_error.log
    CustomLog \${APACHE_LOG_DIR}/fscr_validacion_materiales_access.log combined
</VirtualHost>
EOF
fi

echo "== 8/8 Habilitando modulos, sitio, verificando y recargando Apache =="
sudo a2enmod proxy proxy_http rewrite
sudo a2ensite fscr-validacion-materiales.conf
sudo apache2ctl configtest
sudo systemctl reload apache2

echo
echo "Listo. La encuesta deberia responder en http://100.74.71.100:$PUBLIC_PORT"
echo "Verificando que los demas sitios (facturas :80/:9100, sgi :8081) sigan intactos:"
sudo ss -tlnp | grep -E ':80|:8081|:8082|:9100|:18082' || true
pm2 list
