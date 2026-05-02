# Historia Clínica Nutricional — versión web (GitHub Pages + Supabase)

Aplicación web accesible desde **cualquier dispositivo con navegador** (notebook, tablet Android, celular). Los datos se guardan en la nube en Supabase y se sincronizan automáticamente.

## Cómo funciona

- **GitHub Pages** sirve la web (HTML + JS estático). URL pública: `https://TU_USUARIO.github.io/historia-clinica`
- **Supabase** guarda los datos (PostgreSQL) y maneja el login con email + contraseña
- **Modelo "espacio compartido"**: todos los usuarios autorizados ven los mismos pacientes (ideal para consultorio donde compartís acceso con secretaria/colega)

---

## Setup completo (~20 minutos, una sola vez)

### Parte 1 — Crear proyecto en Supabase (5 min)

1. Andá a [supabase.com](https://supabase.com) y hacé clic en **"Start your project"**
2. Registrate con GitHub o email
3. Hacé clic en **"New project"**
4. Completá:
   - **Name:** `historia-clinica` (o el que quieras)
   - **Database password:** generá una fuerte y **guardala en un lugar seguro** (Supabase no te la muestra de nuevo)
   - **Region:** **South America (São Paulo)**
   - **Plan:** Free
5. Hacé clic en **"Create new project"** y esperá ~1 minuto a que termine de aprovisionar

### Parte 2 — Crear las tablas (3 min)

1. En el panel de Supabase, en el menú izquierdo hacé clic en **SQL Editor** (ícono `>_`)
2. Hacé clic en **"+ New query"**
3. Abrí el archivo `supabase_setup.sql` (está en este proyecto), copialo **entero**, y pegalo en el editor SQL
4. Hacé clic en **"Run"** (abajo a la derecha) — debería decir "Success. No rows returned"
5. Para verificar: en el menú izquierdo hacé clic en **Table Editor** → deberías ver las 6 tablas creadas: `pacientes`, `antropometria`, `laboratorio`, `dia_alimentario`, `seleccion_alimentos`, `planes_alimentarios`

### Parte 3 — Configurar autenticación (2 min)

Por defecto Supabase pide que confirmes el email cuando creás un usuario, lo cual complica el primer ingreso. Te conviene desactivarlo para uso personal:

1. En el menú izquierdo: **Authentication** → **Providers** → **Email**
2. Desactivá la opción **"Confirm email"**
3. Hacé clic en **"Save"**

> Si querés mantener la confirmación de email activada (más seguro), está bien — pero entonces cada vez que crees un usuario tenés que ir a tu mail y hacer clic en el link de confirmación.

### Parte 4 — Crear tu primer usuario (1 min)

1. En el menú izquierdo: **Authentication** → **Users** → **"Add user"** → **"Create new user"**
2. Pegá tu email y una contraseña (mínimo 6 caracteres)
3. Marcá **"Auto Confirm User"**
4. Hacé clic en **"Create user"**

Más adelante, para darle acceso a otra persona, repetís este mismo paso con su email — o simplemente usás el botón "Crear cuenta nueva" desde la app.

### Parte 5 — Copiar las credenciales (2 min)

1. En el menú izquierdo: **Settings** (engranaje) → **API**
2. Vas a ver dos valores que necesitás:
   - **Project URL** (algo como `https://xxxxxxxx.supabase.co`)
   - **anon public** (es una clave larga que arranca con `eyJ...`)
3. **No cierres esta pestaña**, las vas a usar enseguida.

### Parte 6 — Configurar la app (1 min)

1. En la carpeta del proyecto, abrí el archivo **`config.js`** con cualquier editor de texto (Bloc de notas, VS Code, lo que sea)
2. Reemplazá los placeholders por los valores que copiaste:
   ```javascript
   window.HC_CONFIG = {
     SUPABASE_URL: "https://xxxxxxxx.supabase.co",
     SUPABASE_ANON_KEY: "eyJhbGciOi....(clave larga)..."
   };
   ```
3. Guardá el archivo

> ⚠️ **Importante:** la clave `anon` es PÚBLICA y segura de exponer en GitHub. Está protegida por las reglas de seguridad (RLS) y por el login. **Nunca pegues acá la clave `service_role`** (esa sí es secreta).

### Parte 7 — Subir a GitHub (5 min)

#### Opción simple: con la web de GitHub (sin terminal)

1. Andá a [github.com](https://github.com) e iniciá sesión
2. Hacé clic en el **"+"** arriba a la derecha → **"New repository"**
3. Completá:
   - **Repository name:** `historia-clinica`
   - **Privacy:** **Private** (recomendado)
   - **NO** marques "Add a README"
4. Hacé clic en **"Create repository"**
5. En la pantalla siguiente, hacé clic en **"uploading an existing file"**
6. Arrastrá los archivos de la carpeta del proyecto:
   - `index.html`
   - `app.js`
   - `config.js` (con tus credenciales ya pegadas)
   - `README.md`
   - `supabase_setup.sql` (opcional, sirve de respaldo)
7. Abajo, en "Commit changes", hacé clic en **"Commit changes"**

#### Opción con git (si lo manejás)

```bash
cd hc-web
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/historia-clinica.git
git push -u origin main
```

### Parte 8 — Activar GitHub Pages (1 min)

1. En tu repo de GitHub, andá a **Settings** (pestaña arriba) → **Pages** (menú izquierdo)
2. En **"Source"** elegí **"Deploy from a branch"**
3. En **"Branch"** elegí **`main`** y **`/ (root)`**
4. Hacé clic en **"Save"**
5. Esperá 1-2 minutos. Volvé a recargar la página de **Pages** y vas a ver: **"Your site is live at https://TU_USUARIO.github.io/historia-clinica/"**

🎉 **¡Listo!** Ya podés abrir esa URL desde la notebook, la tablet, el celular, lo que sea.

---

## Uso diario

1. Abrí la URL en cualquier dispositivo
2. Iniciá sesión con tu email y contraseña
3. Cargá pacientes, antropometría, laboratorio, día alimentario, anamnesis y planes
4. Exportá la HC completa o un plan individual a Word con un clic
5. Cuando termines, hacé "Salir" (especialmente en dispositivos compartidos)

### Darle acceso a otra persona

Cualquiera de estas dos formas:

**Forma A (vos creás la cuenta):** desde Supabase → Authentication → Users → Add user → Create new user (con su email y una contraseña que le pasás)

**Forma B (que se registre solo):** le pasás la URL y la persona hace clic en "Crear cuenta nueva"

En cualquier caso, una vez registrado, ya ve los mismos pacientes que vos.

---

## Backup de los datos

Supabase hace backups automáticos diarios en su plan gratuito (con retención de 7 días). Si querés un backup manual:

1. **Settings** → **Database** → **Backups**: descargás el backup completo
2. O desde **SQL Editor** corrés `SELECT * FROM pacientes` (y las otras tablas) y exportás como CSV

---

## Cómo actualizar la app

Si querés cambiar algo (agregar campos, cambiar diseño, etc.):

1. Editás los archivos en la web de GitHub (clic en cualquier archivo → ícono lápiz) o desde tu computadora con git
2. Hacés commit
3. GitHub Pages actualiza automáticamente la URL en ~1 minuto

---

## Problemas comunes

**"Falta configurar Supabase"** al abrir la app
→ El archivo `config.js` no tiene tus credenciales. Editalo y subí los cambios.

**"Invalid API key"** al iniciar sesión
→ La `SUPABASE_ANON_KEY` está mal copiada. Volvé a Settings → API y copiala completa.

**"Email not confirmed"** al iniciar sesión
→ Tenés "Confirm email" activado en Supabase. O lo desactivás (Parte 3), o vas a tu mail y confirmás el link.

**La página queda en blanco**
→ Abrí la consola del navegador (F12 → Console) y mirá el error. Lo más común es config mal cargado.

**No me deja agregar/ver pacientes**
→ Verificá que ejecutaste el script SQL completo (Parte 2). Las políticas RLS son las que dan permisos.

---

## Costos

Todo es gratis para tu volumen:

- **GitHub Pages** privado: gratis ilimitado
- **Supabase Free Tier**: 500 MB de base de datos (miles de pacientes), 5 GB transferencia/mes, sin tarjeta de crédito requerida

Si en algún momento crecés mucho, Supabase Pro cuesta USD 25/mes con 8 GB de base.

---

## Estructura de archivos

```
hc-web/
├── index.html              # UI completa (login + app)
├── app.js                  # Toda la lógica JS
├── config.js               # ⚠️ Editá acá tus credenciales de Supabase
├── supabase_setup.sql      # Script para crear tablas (correr 1 vez en Supabase)
└── README.md               # Este archivo
```

---

## Sobre la privacidad de los datos

Los datos de tus pacientes viven en servidores de Supabase en San Pablo, Brasil. Están encriptados en reposo y en tránsito (HTTPS). El acceso requiere login.

Para uso personal/consultorio chico está bien. Si crece y manejás muchos datos sensibles, consultá con alguien que sepa de Ley 25.326 sobre protección de datos personales para asegurarte de cumplir con todo lo formal.
