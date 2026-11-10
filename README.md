# Horario, Notas Rápidas & Diario Personal 🗓️📓

Aplicación web Full-Stack Mobile-First construida con **SvelteKit (Svelte 5 Runes)**, **Tailwind CSS** y **Supabase (PostgreSQL + RLS)** para gestión personal de rutinas, notas rápidas e introspección diaria con privacidad absoluta.

---

## 🛠️ Stack Tecnológico (100% Gratuito)

- **Framework Full-Stack**: SvelteKit 3 + Svelte 5 (sintaxis runes: `$state`, `$derived`, `$effect`, `$props`).
- **Base de Datos y Auth**: Supabase (PostgreSQL + Row Level Security).
- **Estilos**: Tailwind CSS v4 (Mobile-First, modo oscuro/claro automático y manual).
- **Iconos y Markdown**: `@lucide/svelte` / `lucide-svelte`, `marked`.
- **Despliegue**: Preparado para Vercel o Cloudflare Pages (`@sveltejs/adapter-auto`).

---

## 🔒 Arquitectura de Seguridad y Privacidad

1. **Autenticación Única**: Registro público cerrado en Supabase Auth. Acceso exclusivo para el usuario administrador creado desde el panel.
2. **Protección de Rutas (`src/hooks.server.ts`)**: Middleware que intercepta todas las peticiones y redirige a `/login` si no hay sesión válida activa.
3. **Row Level Security (RLS)**: Todas las tablas (`schedule_blocks`, `daily_logs`, `quick_notes`) exigen la regla estricta `auth.uid() = user_id` para operaciones SELECT, INSERT, UPDATE y DELETE.

---

## 🚀 Puesta en Marcha en Local

### 1. Clonar e Instalar dependencias
```bash
npm install
```

### 2. Configurar Base de Datos en Supabase
1. Crea un proyecto gratuito en [Supabase](https://supabase.com).
2. Ve al **SQL Editor** de tu proyecto y pega el contenido completo del archivo [`supabase_schema.sql`](./supabase_schema.sql). Pulsa **Run**.
3. En **Authentication > Configuration > Sign In / Providers > Email**, desmarca la casilla **"Enable Signups"** (deshabilita el registro público).
4. En **Authentication > Users**, haz clic en **"Add user" > "Create user"** y crea tu usuario personal con tu email y contraseña.
5. Ve a **Project Settings > API** y copia tu `URL` y tu `anon public key`.

### 3. Configurar `.env`
Crea o edita el archivo `.env`:
```env
PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
PUBLIC_SUPABASE_ANON_KEY="tu-clave-anonima-publica"
```

### 4. Ejecutar el Servidor de Desarrollo
```bash
npm run dev
```
Abre en tu navegador: [http://localhost:5173](http://localhost:5173)

---

## 📱 Pantallas y Funcionalidades

### A. `/login` (Acceso Privado)
- Formulario limpio de Email y Contraseña.
- Sin enlaces de registro ni recuperación pública.
- Si aún no has conectado Supabase, permite un modo de prueba local con `localStorage`.

### B. `/` (Dashboard Principal)
- **Cabecera con Navegador de Fecha**: Muestra el día actual en español, botones `< Ayer`, `Hoy` y `Mañana >`, y selector de fecha directo.
- **Bloque 1: Horario del Día (`ScheduleList.svelte`)**:
  - Filtro por día: Automático (Semana / Fin de semana), Lun-Vie, Sáb-Dom o Todos.
  - Indicador en tiempo real: Detecta automáticamente el bloque actual de la jornada según la hora del reloj y lo resalta con un brillo visual y badge `AHORA`.
  - Check interactivo con **Optimistic UI**: Actualiza de inmediato visualmente y sincroniza `completed_blocks` con Supabase.
  - Modo **"Editar Horario"**: Permite añadir bloques, modificar horas y textos, reordenar con flechas arriba/abajo y eliminar.
  - Botón para cargar rutina recomendada inicial si no tienes bloques creados.
- **Bloque 2: Notas Rápidas (`QuickNotes.svelte`)**:
  - Input rápido en la parte superior que guarda pulsando `Enter`.
  - Notas fijadas (Pin 📌) destacadas arriba.
  - Botón para archivar/completar (✓) y papelera.
  - Sección desplegable con historial de notas archivadas y opción para restaurarlas.
- **Bloque 3: Diario del Día (`DiaryEditor.svelte`)**:
  - Selector de estado de ánimo (Mood: 🚀, 🎯, 😊, 🧘, 🤔, 🥱, 😓).
  - Pestañas para alternar entre modo **Escribir** (con barra de atajos Markdown: negrita, listas, citas, encabezados) y **Vista Previa** (renderizado en tiempo real).
  - **Autoguardado inteligente (Debounce a 1.5s)**: Guarda automáticamente en `daily_logs` al pausar la escritura, con indicador visual `Guardado ✓`.
  - Contador de palabras y caracteres.

### C. `/historial` (Vista Calendario Mensual)
- Navegador mes a mes.
- Indicador visual por día de tareas completadas, estados de ánimo y entradas de diario escritas.
- Clic en cualquier día para abrir directamente su dashboard.

---

## 📦 Despliegue en Vercel o Cloudflare Pages

1. Sube este repositorio a tu cuenta de GitHub:
   ```bash
   git remote add origin https://github.com/tu-usuario/tu-repo.git
   git push -u origin main
   ```
2. Importa el repositorio en **Vercel** o **Cloudflare Pages**.
3. Añade las dos variables de entorno en el panel de despliegue:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
4. ¡Listo! El despliegue se realiza automáticamente con HTTPS.
