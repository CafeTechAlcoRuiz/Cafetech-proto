# 🚀 Guía de Despliegue - CafeTech en Render Cloud

## 📋 Pre-requisitos
- Cuenta en [GitHub](https://github.com)
- Cuenta en [Render.com](https://render.com)
- Cuenta en [CloudAMQP](https://www.cloudamqp.com)
- Docker instalado localmente (opcional, para probar)

---

## ✅ PASO 1: Registrarse en CloudAMQP (5 minutos)

### 1.1 Crear cuenta gratuita
1. Ve a https://www.cloudamqp.com
2. Click en "Sign Up"
3. Completa el formulario y verifica email
4. Elige el plan **"Little Lemur - Free"** (1 GB gratis, perfecto para desarrollo)

### 1.2 Obtener URL de conexión
1. En el dashboard, haz click en tu instancia
2. Busca la sección **"AMQP URL"**
3. Debería verse algo así: `amqps://usuario:contraseña@fox.rmq.cloudamqp.com/usuario`
4. **Copia esta URL - la necesitarás en Render**

✅ Paso 1 completado. Ya tienes RabbitMQ en la nube.

---

## 🐳 PASO 2: Push del código a GitHub

### 2.1 Preparar el repositorio
```bash
# Asegúrate de estar en tu rama
git branch -a

# Ver cambios
git status

# Agregar todos los cambios
git add .

# Commit
git commit -m "feat: agregar Dockerfiles y configuración para Render Cloud"

# Push a tu rama
git push origin ruiz
```

### 2.2 Crear rama main si no existe
```bash
# Crear rama main desde ruiz
git checkout -b main

# Push a main
git push origin main
```

---

## ☁️ PASO 3: Configurar en Render.com

### 3.1 Crear cuenta en Render
1. Ve a https://render.com
2. Click "Get Started" → "Sign up with GitHub"
3. Autoriza Render para acceder a tu GitHub
4. Selecciona el repositorio `Cafetech-proto`

### 3.2 Crear servicio para API Gateway

1. **Click en "New +"** → **"Web Service"**

2. **Configuración del servicio:**
   - **Name:** `cafetech-gateway`
   - **Region:** `Frankfurt` (o más cercana a ti)
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node dist/gateway/server.js`

3. **Agregar variables de entorno:**
   ```
   NODE_ENV                 = production
   JWT_SECRET              = (genera un string aleatorio fuerte)
   RABBITMQ_URL            = amqps://usuario:contraseña@fox.rmq.cloudamqp.com/usuario
   ZEEBE_URL              = http://[IP_ZEEBE]:26500
   ZEEBE_INSECURE_CONNECTION = true
   POSTGRES_HOST           = [IP_POSTGRES_RENDER]
   POSTGRES_USER           = postgres
   POSTGRES_PASSWORD       = (contraseña fuerte)
   ```

4. **Click "Create Web Service"**

⏳ Esperamos el deployment (2-5 minutos)

### 3.3 Crear PostgreSQL (Base de datos)

1. **Click "New +"** → **"PostgreSQL"**

2. **Configuración:**
   - **Name:** `cafetech-postgres`
   - **Database:** `cafetech`
   - **Username:** `postgres`
   - **Region:** Misma que el Gateway

3. **Click "Create Database"**

4. **Copiar la "Internal Database URL"** - la usaremos en los microservicios

### 3.4 Crear MongoDB

1. **Click "New +"** → **"MongoDB"**

⚠️ **Render no ofrece MongoDB gratis**, alternativas:
   - **MongoDB Atlas** (https://www.mongodb.com/cloud/atlas) - Gratuito con límites
   - **O usar PostgreSQL** para todo

Recomiendo: Usa **MongoDB Atlas** gratuito (500 MB).

### 3.5 Crear microservicios

Repite para cada microservicio:

#### MS-Orders
1. **"New Web Service"**
   - **Name:** `cafetech-ms-orders`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node dist/ms-orders/worker.js`
   - **Variables:** (iguales al Gateway + BD URLs)

#### MS-Kitchen
1. **"New Web Service"**
   - **Name:** `cafetech-ms-kitchen`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node dist/ms-kitchen/worker.js`

#### MS-Notifications
1. **"New Web Service"**
   - **Name:** `cafetech-ms-notifications`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node dist/ms-notifications/worker.js`

---

## 🔗 PASO 4: Configurar variables de entorno en Render

### Para CADA servicio:

1. Go al servicio en Render
2. **Settings** → **Environment**
3. Agrega todas las variables del `.env.example`

**Ejemplo de variables críticas por servicio:**

| Variable | Gateway | Orders | Kitchen | Notifications |
|----------|---------|--------|---------|---------------|
| RABBITMQ_URL | ✅ | ✅ | ✅ | ✅ |
| POSTGRES_HOST | ✅ | ✅ | ✅ | ❌ |
| MONGO_URI | ❌ | ❌ | ❌ | ✅ |
| ZEEBE_URL | ✅ | ✅ | ✅ | ❌ |

---

## 🔍 PASO 5: Verificar deployments

1. En el dashboard de Render, ve cada servicio
2. **Logs** - busca errores
3. El Gateway debería estar en `https://cafetech-gateway.render.com`

### Probar el API Gateway:
```bash
# Login
curl -X POST https://cafetech-gateway.render.com/login \
  -H "Content-Type: application/json" \
  -d '{}'

# Crear orden
curl -X POST https://cafetech-gateway.render.com/orders \
  -H "Authorization: Bearer [TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{"items": [{"id": "cafe", "cantidad": 2}]}'
```

---

## 🐛 Troubleshooting

### "Service failed to start"
- Ver **Logs** en Render
- Verificar variables de entorno
- Verificar conexión a CloudAMQP

### "Cannot connect to RabbitMQ"
- Verificar RABBITMQ_URL es correcta
- Verificar firewall de CloudAMQP permite tu IP

### "Cannot connect to PostgreSQL"
- Verificar POSTGRES_HOST (usar la URL interna de Render)
- Crear base de datos `cafetech` manualmente si es necesario

---

## 📊 Monitoreo

En Render Dashboard:
- **Metrics** - CPU, Memoria
- **Logs** - Errores en tiempo real
- **Events** - Cambios y deployments

---

## 💡 Próximos pasos

### Opcional: CI/CD automático
Al hacer push a `main`, Render redeploy automáticamente.

### Opcional: Custom Domain
En **Settings** > **Custom Domain**, agrega tu dominio.

### Opcional: Auto-scaling
En **Settings** > **Plan**, cambia a "Pro" para auto-scaling.

---

## 🎯 Resumen de costos (Gratuito)

| Servicio | Plan Gratis | Costo |
|----------|-----------|--------|
| CloudAMQP | Little Lemur (1GB) | **$0** |
| Render Gateway | Starter | **$0** (máx 10 GB/mes) |
| Render MS (3x) | Starter | **$0** |
| PostgreSQL | Starter | **$0** (máx 1GB) |
| MongoDB Atlas | Free | **$0** (máx 500MB) |
| **TOTAL** | | **$0** |

✅ ¡Tu proyecto está en la nube sin costo! 🎉
