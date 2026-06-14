## Qué pasó (te lo explico simple)

Imagínate una caja de juguetes (la base de datos) donde guardas **1099 fichitas** de materiales asignados a vales. Cuando la app le pide a la caja "dame todas las fichitas", la caja por seguridad solo le pasa **las primeras 1000** y se queda con las otras 99 guardadas. Tu material **TEE FUSIÓN DE 25 MM (M0228)** quedó en esas 99 escondidas.

Por eso:
- **No lo ves en la lista** (la app no lo recibió).
- **Sí existe en la base de datos** (yo lo veo: A2 · V01 · Etapa 1 · qty 4).
- **Al agregarlo de nuevo da error** "duplicate key" porque la base sí sabe que ya está.

Y lo de "Etapa 1 · Etapa 1" en el desplegable es solo cosmético: la etapa se llama "Etapa 1" y además se le pone el prefijo "Etapa 1". Sale repetido.

## Cómo lo arreglo

### 1. Traer TODAS las filas (no solo 1000)
En `src/lib/sites-queries.ts`, cambio la función `fetchAll` para que pida los datos por **tandas de 1000** hasta vaciar la caja, usando `.range(from, to)` de Supabase en un bucle. Así trae las 1099 (y más en el futuro).

### 2. Quitar la repetición visual "Etapa 1 · Etapa 1"
En `src/sections/vale-tipo.tsx`, en el desplegable de Etapa: si el `name` ya empieza con "Etapa", muestro solo el `name`. Si no, muestro `Etapa N · name`.

### 3. Verificar
Después de aplicar, abrir Vale Tipo → A2 → V01 → Etapa 1 y confirmar que aparecen los 5 materiales incluyendo TEE FUSIÓN con cantidad 4.

## Archivos a tocar
- `src/lib/sites-queries.ts` — paginar `fetchAll`.
- `src/sections/vale-tipo.tsx` — etiqueta de etapa sin repetir.

No toco la base de datos, no borro nada, no cambio contraseñas.