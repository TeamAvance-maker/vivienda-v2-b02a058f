## Lo que entendí (en simple)

Una casa es como una **torta de muchos pisos**. Cada piso es un **vale tipo** (Electricidad, Techumbre, Puertas…). Algunos pisos se hacen en **capas (etapas)**. Hay **102 casas** repartidas en 5 manzanas, y cada casa tiene un **tipo** (A1, A2, B, C). Para que una casa esté "lista", hay que entregar todos sus vale tipo.

Tus respuestas claras:
- **Etapas**: sugeridas, no obligadas (el sistema avisa si te saltas una).
- **Auto-completar**: mostrar lo que falta, dejar **modificar cantidades** (por pérdidas/mermas), y confirmar siempre con aviso. **Nunca duplica** lo ya entregado.
- **Convivencia**: **reemplazar todo de una** (lo viejo se va).
- **Vista**: matriz general + detalle por sitio (después, plano dinámico).

---

## El plan, paso a paso

### Paso 1 — Planilla de materiales duplicados (ANTES de tocar nada)

Tomo el ODS que subiste, agrupo los 353 materiales por nombre parecido (mayúsculas, espacios, tildes) y te genero un **Excel** con columnas:

```
Grupo | Material tal cual aparece | Veces que aparece | Vale tipos donde aparece | ¿Cuál es el correcto? (vacío para que tú marques)
```

Lo descargas, lo revisas, marcas el nombre bueno, y me lo devuelves. Recién ahí cargo materiales a la base. **Esto es entregable, no cambia la app todavía.**

### Paso 2 — Estructura nueva en la base de datos

Creo tablas nuevas (no toco las viejas todavía):

```text
sites              → las 102 casas (manzana, sitio, tipo_casa)
vale_types         → los ~49 vale tipo (código, nombre, sección)
vale_stages        → las etapas de cada vale (vale_id, n° etapa, nombre)
vale_materials     → qué materiales y cuántos lleva cada etapa de cada vale,
                     por tipo de casa (A1, A2, B, C)
site_deliveries    → entregas: a qué sitio, qué vale, qué etapa, qué materiales,
                     fecha, modo (manual / auto-completar), nota
```

Cargo los 102 sitios (la lista que me pasaste) y los vale tipos del ODS (ya con los nombres correctos que tú validaste en el paso 1).

### Paso 3 — Pantallas nuevas (reemplazan las viejas)

1. **Inicio (nuevo)**: KPIs de avance: % obra, sitios completos, vales más atrasados, alertas de stock.
2. **Sitios y Vales** (matriz): 102 filas × vale tipos en columnas, con semáforo:
   - 🟢 verde = vale completo
   - 🟡 amarillo = parcial
   - ⚪ gris = sin tocar
3. **Detalle de sitio** (clic en una celda): muestra el vale con sus etapas, los materiales pedidos vs entregados, y los botones:
   - **Entregar manual** (escribes cantidades)
   - **Auto-completar lo que falta** → muestra previsualización editable + aviso "vas a entregar X. ¿Confirmas?"
4. **Recepciones** (igual que ahora, descuenta del mismo stock).
5. **Inventario / Conteo físico** (igual).
6. **Materiales / Vale tipos** (administración, con contraseña).
7. **Reportes**: Excel/PDF con avance por sitio, por manzana, por vale tipo.
8. **Configuración** (igual).

El **plano dinámico** queda para una fase siguiente, lo conversamos cuando esto funcione.

### Paso 4 — Migración segura

Hago **respaldo completo** (descarga JSON) antes de tocar nada. Si algo sale mal, restauramos. Las recepciones e inventarios viejos se conservan (son datos reales).

---

## Por qué este orden

La **planilla de duplicados primero** es la regla de oro: si cargo materiales sucios, después arreglar es 10 veces más caro. Mejor 1 hora tuya marcando "este sí, este no" que reconstruir vales mal cargados.

## Lo que necesito de ti antes de construir

1. ✅ Aprobar este plan.
2. Después te entrego la **planilla de duplicados** (Paso 1).
3. Tú marcas los nombres correctos y me la devuelves.
4. Ahí sí construyo todo lo demás.

## Detalles técnicos (para el archivo)

- Nuevas tablas en `public` con RLS y GRANT a `authenticated` + `service_role`.
- Mantengo el flujo de contraseña "TheDoors" para admin.
- Las tablas viejas (`house_types`, `house_material_req`, `deliveries`, `delivery_houses`, etc.) se quedan inertes hasta que confirmes todo OK; entonces las archivamos.
- Lógica de "auto-completar sin duplicar": `faltante = requerido_total − sumatoria(entregado_previo)`. Imposible duplicar por diseño.
