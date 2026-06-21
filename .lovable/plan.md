## Qué vamos a hacer

Agregar una **barra de progreso de un solo renglón con 3 colores** dentro del indicador principal (la tarjeta grande de arriba a la derecha del dashboard), que muestre de un vistazo cómo están repartidos los sitios totales:

- 🟢 **Terminados** — verde suave estilo "salvia/oliva"
- 🟡 **En ejecución** — dorado/ámbar tipo miel
- 🔴 **Sin iniciar** — terracota suave (rojo "tierra cocida")

Estos tonos no serán colores puros: se ajustarán a la paleta "Boutique Café" del sitio, así que se sentirán parte del diseño (no semáforo de tránsito).   
que sean más opacos de los que me sugeriste por favor

### Cómo se verá

```text
┌──────────────────────────────────────────────────────────┐
│  Distribución de sitios                                   │
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│   45%           30%                25%                    │
│                                                           │
│  ● Terminados 45 (45%)  ● En ejecución 30 (30%)  ● Sin iniciar 25 (25%) │
└──────────────────────────────────────────────────────────┘
```

- Una sola barra dividida en 3 segmentos proporcionales al % de cada estado.
- Encima/dentro de cada segmento, el **porcentaje**.
- Debajo, una **leyenda** con el puntito de color, el nombre, la cantidad y el %.

### Iconos de las etiquetas (KPIs)

En las tarjetitas KPI de abajo:

- ✅ **Terminadas** → icono en verde salvia
- 🔧 **En Ejecución** → icono en dorado/ámbar
- 🕒 **Sin Iniciar** → icono en terracota

Los colores serán **exactamente los mismos** que la barra, para que el usuario vincule al instante: "el verde de la barra = la tarjeta de Terminadas".

## Detalles técnicos (para el agente)

- Editar `src/sections/dashboard.tsx`:
  - Dentro del `hero-card` (líneas ~566–610), agregar debajo del bloque de "Material limitante / Ver Detalle" un nuevo bloque con la barra apilada y la leyenda. Usa `siteStatusCounts.{terminado, enEjecucion, sinIniciar, total}` que ya existe.
  - La barra: `div` con `flex h-3 w-full overflow-hidden rounded-full bg-white/10`, y 3 hijos con `style={{ width: pctX + "%" }}` y `background` de los 3 tonos.
  - Tonos en `oklch` (boutique-café, ya disponibles como tokens):
    - verde: `oklch(0.62 0.09 145)` (salvia / oliva tierno)
    - amarillo: `var(--gold)` (ya existe — dorado miel)
    - rojo: `var(--terracotta)` (ya existe — terracota)
  - Leyenda: 3 chips con `inline-flex items-center gap-1.5` y un `span` redondo de 8px del color.
  - En los `<KPI>` (líneas 722–744), pasar una nueva prop `iconColor` (string CSS color) y aplicarla al `<Icon>` correspondiente.
  - Localizar el componente `KPI` (más abajo en el mismo archivo) y aceptar `iconColor?: string` → `<Icon style={{ color: iconColor }} />` cuando esté presente; si no, comportamiento actual intacto.

## Lo que NO se toca

- No se cambia el panel "Ver Detalle" (el que se desliza desde la derecha).
- No se cambian los cálculos ni las exportaciones a Excel/PDF.
- No se cambian otras secciones (Plano, Recepciones, etc.).