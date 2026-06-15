## Qué voy a hacer

Una sola migración SQL que limpia el catálogo en 3 frentes. Lo de puertas lo dejamos para después.

### 1) Normalizar unidades (A)
Pasar todas las unidades a MAYÚSCULAS y singular:
- `un`, `uni` → **UN**
- `m2` → **M2**
- `ROLLOS` → **ROLLO**
- Mismo trato para `KG`, `GL`, `SACO`, `TINETA`, `M`.

Resultado: cada concepto con una sola etiqueta.

### 2) Unificar 8 duplicados claros (B)
Para cada par: muevo todos los vales y recepciones del código duplicado al código bueno, y después borro el duplicado.

| Se queda | Se borra | Motivo |
|---|---|---|
| M0010 | M0012 | Mismo anclaje AN 90 |
| M0206 | M0207 | Typo "1 UNPARA" |
| M0208 | M0209 | Espacio extra |
| M0253 | M0254 | Typo "PUNTAFINA" |
| M0147 | M0148 | "DE 3 M" vs "DE 3 METROS" |
| M0159 | M0160 | "DE 3,20 M" vs "DE 3,20 METROS" |
| M0290 | M0292 | Singular vs plural |
| M0291 | M0293 | Singular vs plural |

### 3) Dudosos (B) — quedan aparte
Confirmé que tienen rendimientos distintos por casa, así que **no los toco**:
- M0078 (0.05/casa) ≠ M0079 (0.2/casa)
- M0170 (0.13 y 1) ≠ M0171 (0.67)

### 4) Tornillos (C) — resuelto, no se tocan
Cada código de tornillo es un material distinto aunque la descripción se parezca, porque varían en:
- **Medida** (mm y pulgadas, ej: cabeza lenteja 8 1/2)
- **Tipo de rosca** (fina o gruesa)
- **Tipo de punta** (fina o gruesa)

Cada combinación tiene un propósito distinto en obra, así que se mantienen separados.

### 5) Puertas (D) — pendiente
Lo vemos después. El usuario aclara mañana cómo llegan a obra (puerta suelta DER, suelta IZQ, o caja kit con las dos) y ahí decidimos.

## Lo que NO voy a tocar
- Tornillos M0257/M0260/M0283/M0258/M0261
- Puertas y el campo `tracks_handedness`
- Kits M0184/M0185/M0186
- Códigos, RLS, ni la estructura de las tablas

## Detalle técnico
Una sola migración con: `UPDATE materials_v2 SET unit = ...`, luego `UPDATE vale_reqs/receptions/delivery_items SET material_id = <id del bueno>` para cada par, y al final `DELETE FROM materials_v2 WHERE code IN (...)`. Todo dentro de una transacción para que si algo falla, no quede a medias.
