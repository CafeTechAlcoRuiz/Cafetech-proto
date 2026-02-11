@echo off
REM Script para iniciar el proyecto localmente con Docker (Windows)

echo.
echo 🚀 Iniciando CafeTech localmente con Docker...
echo.

REM Verificar si .env existe
if not exist .env (
    echo ⚠️  Archivo .env no encontrado
    echo 📝 Creando .env desde .env.example...
    copy .env.example .env
    echo ✅ .env creado. IMPORTANTE: Edita .env con tus valores reales
    echo.
    echo Ahora edita .env y luego ejecuta este script de nuevo
    exit /b 0
)

echo 📦 Construyendo imágenes Docker...
docker-compose build

echo.
echo 🐳 Iniciando contenedores...
docker-compose up -d

echo.
echo ✅ ¡Servicios levantados!
echo.
echo 📋 Status de servicios:
docker-compose ps
echo.
echo 🌐 API Gateway disponible en: http://localhost:3000
echo 🗄️  PostgreSQL en: localhost:5432
echo 📨 MongoDB en: localhost:27017
echo 🔄 Zeebe en: localhost:26500
echo.
echo 📖 Ver logs:
echo    docker-compose logs -f gateway
echo    docker-compose logs -f ms-orders
echo    docker-compose logs -f ms-kitchen
echo    docker-compose logs -f ms-notifications
echo.
echo ⛔ Detener servicios:
echo    docker-compose down
echo.
pause
