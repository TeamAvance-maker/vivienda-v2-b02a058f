# Plan: Depuración completa del sitio

## Qué voy a hacer (explicado fácil)

Como cuando revisas una casa antes de entregarla: voy a entrar a **cada pieza** (cada pestaña de la app), probar **cada botón**, y anotar lo que no funciona. Después arreglo lo que esté roto y vuelvo a probar.

## Lo que ya encontré revisando el código y la base de datos

1. **Falta la fila de configuración del proyecto** en la base de datos. La tabla `project_config` está vacía, y la app intenta "actualizar" la fila con `id = 1`. Como no existe, el botón **"Guardar (pide contraseña)"** de la pestaña Configuración no guarda nada (silenciosamente no hace efecto). Hay que crear la fila inicial por migración y cambiar el guardado a **insertar-o-actualizar** para que nunca vuelva a pasar.
2. **Botones duplicados en Entregas → Por viviendas.** Hay dos botones uno al lado del otro: *Previsualizar* y *Confirmar entrega*. Los dos hacen exactamente lo mismo (abren el cuadro de confirmación). Es confuso. Propongo dejar solo **uno** llamado *Revisar y confirmar*.
3. **En la sesión anterior apareció un cartel rojo de Vite** (error overlay). Hoy no se ve, pero lo vamos a confirmar recargando el preview limpio.

## Cómo voy a hacer la auditoría (paso a paso)

Recorro las 9 pestañas en orden y pruebo cada acción visible:

```
1. Inicio (Dashboard)
   - hero, los 7 KPIs, "Avance por tipo", tabla maestra, alertas

2. Recepciones
   - formulario "Nueva recepción"
   - búsqueda
   - botón editar (lápiz) + contraseña
   - botón eliminar (basurero) + contraseña

3. Entregas
   - pestaña "Por viviendas": agregar tipo, previsualizar, confirmar
   - pestaña "Manual": agregar ítem, guardar
   - fila del historial: expandir, editar fecha/nota, editar ítem,
     editar viviendas, eliminar entrega

4. Inventario
   - registrar conteo (con y sin "sentido izq/der"), pero debe estar también el conteo por separado izquierda y derecha.

5. Tipos vivienda
   - agregar tipo
   - eliminar tipo (basurero + contraseña)
   - verificar contador "Total / objetivo"

6. Materiales
   - agregar material (con y sin "sentido izq/der")
   - eliminar material (basurero + contraseña)

7. Distribución
   - selector de tipo, agregar requerimiento, eliminar

8. Reportes
   - exportar Excel, CSV, PDF, Imprimir
   - vista previa cargada

9. Configuración
   - guardar nombre / total / umbral (PROBLEMA conocido)
   - ajuste manual ± con motivo
   - respaldo JSON (descargar)
   - restauración JSON (subir + contraseña)
```

Para cada botón anoto: **funciona / no funciona / error mostrado**. Voy a usar el navegador del sandbox (no toco tus datos reales — uso datos de prueba mínimos que después se borran).

## Arreglos previstos (lo seguro)

1. **Migración a la base de datos**: insertar la fila inicial de `project_config` (id=1, nombre "Mi Obra", total 0, umbral 10) si no existe.
2. `**saveConfig` en `src/sections/config.tsx**`: cambiar de UPDATE a UPSERT — así nunca falla silenciosamente.
3. **Entregas → Por viviendas**: dejar un solo botón *Revisar y confirmar*.
4. **Lo que aparezca en la auditoría**: lo voy listando y arreglando uno por uno, sin tocar nada que ya funcione.

## Lo que NO voy a tocar (regla del documento maestro)

- Tablas, columnas, vistas existentes (no renombrar nada).
- La contraseña "TheDoors" ni el flujo de mutaciones admin.
- El dashboard ya validado (KPIs, hero, fórmula de "viviendas posibles").
- Archivos auto-generados (`integrations/supabase/*`, `routeTree.gen.ts`, `.env`).
- El módulo de respaldo temporal (sigue ahí hasta que migremos a vales).

## Antes de seguir

Cuando me apruebes este plan, paso a modo construcción y:

1. Aplico la migración y los 3 arreglos seguros de arriba.
2. Hago la pasada de auditoría en el preview con datos de prueba.
3. Te entrego una lista corta tipo lista de supermercado:
  *"Esto funcionaba ✅ / Esto estaba roto y lo arreglé 🔧 / Esto necesita decisión tuya ❓"*.

¿Procedo así?