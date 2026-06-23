## Qué entendí ahora

No quieres copiar UNA etapa de un vale a otro tipo de casa (eso es lo que armamos antes). Quieres tomar un **vale tipo completo** (por ejemplo "Acometida", que hoy tiene materiales cargados para A1 y A2) y **clonar todos sus materiales — de todas sus etapas — para los tipos de casa B y C**, sin generar entregas.

El vale tipo en sí (Acometida) ya existe y es uno solo para toda la obra. Lo que falta son las filas de `vale_reqs` (los materiales por etapa) para los tipos de casa que aún no lo tienen.

## Cómo va a funcionar para ti

En la pantalla **Vale Tipo**, además del botón actual "Copiar a otro tipo de casa" (que copia solo la etapa que estás viendo), agrego un **segundo botón** al lado del selector de Vale tipo:

**🔁 Copiar VALE COMPLETO a otros tipos de casa**

Al apretarlo se abre una ventanita que muestra:

1. **Origen**: el vale tipo seleccionado (ej. "Acometida") + el tipo de casa origen (ej. A1).
2. **Resumen**: "Se copiarán X materiales repartidos en Y etapas".
3. **Tipos de casa destino**: casillitas A1/A2/B/C (sin el origen). Puedes marcar varios a la vez.
4. **Sobrescribir si ya existe** (apagado por defecto): si en el destino ya hay materiales para alguna etapa, los respeta. Si lo enciendes, actualiza las cantidades.
5. **Contraseña de obra**.
6. Botón **Copiar**.

Al terminar te muestra un resumen tipo: `B: +24 nuevos · C: +24 nuevos (omitidos 0)`.

**Importante**: solo crea/actualiza filas en `vale_reqs` (la "plantilla"). **No genera ninguna entrega ni mueve inventario**, igual que pediste.

## Detalle técnico

- **Nueva función servidor** en `src/lib/admin.functions.ts`: `copyValeTypeToHouseTypesFn`.
  - Input: `passphrase`, `vale_type_id`, `source_house_type`, `target_house_types[]`, `overwrite?`.
  - Lee todas las `vale_stages` del `vale_type_id`.
  - Para cada etapa, replica la lógica de `copyValeStageToHouseTypesFn` (lee `vale_reqs` de la etapa+origen, inserta los que no existen, opcionalmente sobrescribe los que existen).
  - Devuelve `{ results: [{ house_type, inserted, updated, skipped }] }` agregado por tipo de casa destino.
- **UI en `src/sections/vale-tipo.tsx`**:
  - Nuevo botón en la fila de selectores, al lado del selector "Vale tipo" (visible solo cuando hay `valeTypeId` elegido).
  - Nuevo `AlertDialog` con checkboxes de tipos de casa destino, checkbox de sobrescribir y campo de contraseña.
  - Usa el mismo `houseType` actual como origen.
  - Invalida queries al terminar para que las tablas se refresquen.

## Lo que NO cambia

- El botón existente "Copiar a otro tipo de casa" (por etapa) se queda igual, por si quieres copiar solo una etapa puntual.
- No se tocan entregas (`site_deliveries`), ni inventario, ni recepciones.
- El historial registra estos cambios solo si activas `adminMutateFn`; te puedo agregar el log en el historial si me dices que sí cuando lo implementemos.
