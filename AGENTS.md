# Historia Clínica Nutricional — contexto del proyecto

App web estática (HTML+JS vanilla) para gestión de historias clínicas nutricionales.
Pensada para Valeria (nutricionista, dueña/usuaria). Dev/admin: jartres (jimbokick@gmail.com).

> Este archivo es la **fuente única de contexto** para todos los asistentes IA del proyecto:
> Claude Code, Gemini CLI, GitHub Copilot y OpenCode. Los demás archivos `CLAUDE.md`,
> `GEMINI.md` y `.github/copilot-instructions.md` son symlinks a este. **Editar este.**

---

## Stack

- **Frontend:** HTML + JS vanilla + Tailwind CSS (CDN). Sin build, sin npm, sin bundler.
- **Backend:** Supabase (PostgreSQL + Auth). Project ref: `ajzqfocntbisjapsmkgr`, región São Paulo, plan Free.
- **Hosting:** GitHub Pages, deploy directo desde `main` del repo.
- **Export Word:** librerías `docx` + `file-saver` por CDN.

## Archivos

- `index.html` — UI completa (login, registro, app principal con tabs).
- `app.js` — toda la lógica (~1000 líneas, sin módulos, sin clases).
- `config.js` — credenciales Supabase. La `anon key` es PÚBLICA y segura (RLS protege).
- `supabase_setup.sql` — schema. Ya aplicado en el proyecto remoto; no re-correr a ciegas.
- `README.md` — guía paso a paso para Valeria/usuario final (NO documentación técnica).

## Modelo de datos

Seis tablas en Supabase, todas con RLS habilitada:

```
pacientes (cabecera)
  ├── antropometria       (1:N, histórico por fecha)
  ├── laboratorio         (1:N, histórico por fecha)
  ├── dia_alimentario     (1:N, recordatorio 24hs)
  ├── seleccion_alimentos (1:N, anamnesis alimentaria)
  └── planes_alimentarios (1:N, planes generados)
```

**Modelo "espacio compartido":** cualquier usuario autenticado ve y edita todo. No multi-tenant. FK `creado_por` referencia `auth.users(id)` solo para auditoría informal.

## Convenciones

- Español rioplatense en UI, comentarios y mensajes. Tutear (`vos`, `andá`, `hacé`, `tenés`).
- Sin frameworks ni build step. Agregar dependencias **solo** vía CDN en `index.html`.
- Cambios al schema: editar `supabase_setup.sql` **y** entregar el SQL puntual a aplicar manualmente en Supabase SQL Editor (Valeria lo ejecuta).
- Estilos: utilities Tailwind. Color primario teal-700 (`#0d9488`).
- Helpers existentes en `app.js`: `$`, `$$`, `hoy()`, `v()`, `esc()`, `calcularImc()`, `calcularEdad()`. Reusarlos antes de inventar otros.

## Restricciones críticas

### Guardrails de claves y tokens (regla dura, sin excepciones)

- **Las claves y tokens NUNCA se commitean a ningún repo.** Ni en código, ni en comentarios, ni en commit messages, ni en issues/PRs, ni en docs (incluido este archivo).
- **Las claves y tokens NUNCA se comparten en chats, screenshots, logs o respuestas a otros usuarios.** Si te pregunto un valor, ofrecé `echo "${VARIABLE}"` desde MI shell — no lo recites vos.
- **El único lugar donde viven es `../.vault/secrets.env`** (mode 600, fuera del repo, fuera de backups en la nube). Todo lo demás los lee de ahí vía env vars.
- **Si encontrás una clave o token "suelto"** en código, en una respuesta de LLM, en historial de shell o donde sea: **detené lo que estés haciendo, avisá, y rotá la clave**. No la "limpies" silenciosamente.
- **Excepción única declarada:** la `SUPABASE_ANON_KEY` vive también en `config.js` porque la app es estática y la necesita en el cliente. Es pública por diseño y RLS la protege. **Cualquier otra clave en `config.js` es un bug de seguridad.**
- **Service role key, DB password, GitHub PAT, login de Valeria**: jamás aparecen en este repo, ni siquiera temporalmente para "probar".

### Resto

- **NUNCA** dejar tablas sin RLS. Toda tabla nueva debe `ENABLE ROW LEVEL SECURITY` con las 4 políticas para rol `authenticated` (SELECT/INSERT/UPDATE/DELETE).
- **Datos sensibles de pacientes** (Ley 25.326 Argentina). No exportar/copiar a servicios externos (LLMs incluidos) sin pedir.
- No romper la compatibilidad con `index.html` cargado desde GitHub Pages (sin server-side, sin cookies HttpOnly: la sesión la maneja Supabase JS en localStorage).

## Vault de claves locales

Secretos en `../.vault/` (hermano del repo, **fuera del scope git**, mode 700). Layout:

```
MisRepos/valerialanutricionista/
├── .vault/              ← acá viven los secrets (mode 700)
│   ├── secrets.env      ← KEY=VALUE (mode 600)
│   ├── load.sh
│   └── README.md
└── historia-clinica/    ← este repo
```

Cargar al shell con:
```bash
source ../.vault/load.sh   # desde historia-clinica/
```

Variables disponibles tras sourcear:
- `SUPABASE_PROJECT_REF`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` (públicas, por comodidad).
- `SUPABASE_USER_EMAIL`, `SUPABASE_USER_PASSWORD` (login de Valeria a la app — secretas).
- `SUPABASE_DB_PASSWORD`, `SUPABASE_SERVICE_ROLE`, `GITHUB_TOKEN` (secretas, completar a demanda).

Ver `../.vault/README.md` para detalles. El `.gitignore` del repo bloquea `.vault/` y `secrets.env` por defensa en profundidad — el vault NO debería terminar nunca dentro del repo, pero si pasa por error, git no lo deja agregar. **Estas variables nunca se imprimen en respuestas, logs, ni se pasan como argumentos visibles** (preferir env vars o stdin).

## No hacer sin preguntar primero

- Migrar a un framework (React/Vue/Svelte/etc.).
- Agregar `package.json`, npm o cualquier build step.
- Refactor masivo de `app.js` (Valeria a veces edita desde la web de GitHub, archivos chicos y planos le sirven mejor).
- Cambiar el modelo de RLS a multi-tenant por usuario.
- Mover credenciales fuera de `config.js` (la app se sirve estática, no hay backend para inyectarlas).

## Skills locales (Claude Code)

Instaladas en `.claude/skills/` (no se commitean — están en `.gitignore`):

- **`supabase`** — referencia oficial de Supabase: Database, Auth, Edge Functions, RLS, supabase-js, CLI, MCP, migraciones, etc.
- **`supabase-postgres-best-practices`** — guía de performance Postgres (queries, indexes, pooling, RLS, schema design).

Reinstalar / actualizar:
```bash
cd historia-clinica
DISABLE_TELEMETRY=1 DO_NOT_TRACK=1 npx skills@latest add supabase/agent-skills -a claude-code -y
```

Solo aplican en este proyecto. Claude las descubre vía `.claude/skills/`.

## Conexiones validadas (probadas el 2026-05-03)

### REST API (uso normal de la app)
- ✅ `SUPABASE_URL` + `SUPABASE_ANON_KEY` funcionan vía REST sobre IPv4.
- ✅ Login email+password de Valeria funciona contra `/auth/v1/token?grant_type=password`.

### Conexión directa a Postgres (psql, migrations, scripts admin)

**No usar el "direct connection"** (`db.<ref>.supabase.co`). Solo publica AAAA (IPv6) y la red local del dev no tiene IPv6 funcional.

**Usar el Session pooler (IPv4):**
```
host:    aws-1-sa-east-1.pooler.supabase.com
port:    6543
user:    postgres.ajzqfocntbisjapsmkgr
dbname:  postgres
sslmode: require
```

⚠️ **Importante:** el shard correcto es `aws-1`, **no** `aws-0` (aws-0 da "Tenant or user not found" para este proyecto). El password del rol `postgres` está en `$SUPABASE_DB_PASSWORD` (vault). Ejemplo:

```bash
source ../.vault/load.sh
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  "host=aws-1-sa-east-1.pooler.supabase.com port=6543 \
   user=postgres.${SUPABASE_PROJECT_REF} dbname=postgres sslmode=require"
```

### Pendientes operativos
- ⏳ `SUPABASE_SERVICE_ROLE` aún vacía en el vault. Cargar desde Dashboard → Settings → API → "Reveal" en `service_role`.
- ⚠️ `GITHUB_TOKEN` actual es PAT clásico con scopes excesivos (`admin:org`, `admin:org_hook`, `write:packages`, etc.). **Rotar a PAT fine-grained** limitado al repo `historia-clinica` con permisos `Contents: Read/Write` + `Metadata: Read`. Reduce blast radius si se filtra.

## Keepalive del proyecto Supabase

Plan Free pausa proyectos con ~7 días sin tráfico. Para evitarlo hay un GitHub Action en `.github/workflows/supabase-keepalive.yml` que una vez por día (12:17 UTC) hace un `GET` al REST API con la `anon key`. Eso cuenta como actividad y mantiene el proyecto despierto. Cadencia diaria = 7x de margen sobre la ventana de pausa.

Requiere 2 secrets en el repo (Settings → Secrets and variables → Actions):
- `SUPABASE_URL` — la URL pública del proyecto.
- `SUPABASE_ANON_KEY` — la JWT pública.

Ambas son técnicamente públicas (la anon key vive en `config.js`), pero usarlas como secrets evita hardcodearlas en el workflow.

## Estado actual

Producción. URL viva en GitHub Pages. Valeria la usa para cargar pacientes reales. Cada cambio que toque `index.html`/`app.js` requiere probar el golden path (login → listar pacientes → abrir ficha → exportar Word) antes de pushear.
