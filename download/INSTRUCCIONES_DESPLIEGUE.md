# Sistema de Requisiciones y Producción

## 🚀 Instrucciones de Despliegue

### 1. Subir a GitHub

```bash
# Inicializar git (si no existe)
git init
git add .
git commit -m "Sistema de Requisiciones y Producción v1.0"

# Crear repositorio en github.com y conectar
git remote add origin https://github.com/TU_USUARIO/tu-repo.git
git branch -M main
git push -u origin main
```

### 2. Configurar Turso (Gratuito)

1. **Crear cuenta**: Ve a [https://turso.tech](https://turso.tech) y regístrate (gratis)
2. **Crear base de datos**:
   ```bash
   # Instalar CLI de Turso
   curl -sSfL https://get.tur.so/install.sh | bash

   # Iniciar sesión
   turso auth login

   # Crear base de datos (gratuito incluye 500 bases de datos, 9GB storage)
   turso db create req-production-db

   # Crear token de autenticación
   turso db tokens create req-production-db

   # Ver URL de la base de datos
   turso db show req-production-db --url
   ```
3. **Configurar variables en .env**:
   ```
   DATABASE_URL="libsql://req-production-db-tu-usuario.turso.io?authToken=TU_TOKEN_AQUI"
   JWT_SECRET="genera-un-string-aleatorio-largo-de-32+-caracteres"
   ```

4. **Sincronizar Prisma con Turso**:
   ```bash
   # Instalar adaptador libSQL para Prisma
   npm install @prisma/adapter-libsql @libsql/client

   # Actualizar prisma/schema.prisma para usar libSQL (ver sección abajo)
   npx prisma db push

   # Ejecutar seed
   npx tsx prisma/seed.ts
   ```

### 3. Para Turso con Prisma

Actualiza tu `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "libsql"
  url      = env("DATABASE_URL")
}
```

Y actualiza `src/lib/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

### 4. Desplegar en Vercel

1. **Crear cuenta**: Ve a [https://vercel.com](https://vercel.com) (gratis)

2. **Conectar repositorio**:
   - En Vercel, haz click en "Add New Project"
   - Selecciona tu repositorio de GitHub
   - Configura las variables de entorno:
     ```
     DATABASE_URL = libsql://req-production-db-tu-usuario.turso.io?authToken=TU_TOKEN
     JWT_SECRET = tu-secret-jwt-aleatorio
     ```

3. **Desplegar automáticamente**:
   - Vercel detecta Next.js automáticamente
   - Haz click en "Deploy"
   - Cada `git push` a `main` se despliega automáticamente

4. **Comandos de build** (Vercel los detecta automáticamente):
   ```
   Build Command: npx prisma generate && npx prisma db push && next build
   ```

### 5. Post-Deploy

Después del primer despliegue, ejecuta el seed desde tu máquina local:

```bash
# Configura .env con la URL de Turso
DATABASE_URL="libsql://req-production-db-tu-usuario.turso.io?authToken=TU_TOKEN"

# Genera cliente y sincroniza
npx prisma generate
npx prisma db push

# Ejecuta seed
npx tsx prisma/seed.ts
```

## 📋 Resumen de la Aplicación

### Módulos
- **Dashboard**: Estadísticas generales, requisiciones y proyectos recientes
- **Inventario**: CRUD de productos, alertas de stock bajo, proveedores por producto
- **Proveedores**: Gestión de proveedores
- **Requisiciones**: Flujo completo (Pendiente → Aprobada → En Curso → Completada/Denegada)
- **Mandriles**: Proyectos de mandriles con componentes, estados y control de merma
- **Fixturas**: Proyectos de fixturas con componentes, estados y control de merma
- **Materiales**: Tipos de material, stock de barras, formas y dimensiones
- **Materiales Especiales**: Prolab, Resina, Epoxy (por kg)
- **Herramientas**: Insertos, brocas, fresas, cortadores con vida útil y registro de uso
- **Configuración**: Gestión de tipos de material, materiales especiales y tipos de herramientas
- **Usuarios**: CRUD de usuarios, activar/desactivar

### Roles
- **ADMIN**: Acceso total (incluye gestión de usuarios)
- **SUPERVISOR**: CRUD de inventario, aprobación de requisiciones, gestión de proyectos
- **USUARIO**: Crear requisiciones, ver información, registrar uso de herramientas

### Usuarios por defecto
| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| admin | admin123 | ADMIN |
| supervisor | supervisor123 | SUPERVISOR |
| usuario | usuario123 | USUARIO |

### Stack Tecnológico
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS 4 + shadcn/ui
- Prisma ORM
- SQLite (dev) / Turso (producción)
- JWT Authentication (HTTP-only cookies, 20h sesión)
- Dark Mode
