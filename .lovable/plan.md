# 🔒 Regla de Candado Global

## Qué voy a hacer

**No voy a tocar código.** Esto es solo una regla que guardo en mi memoria permanente para que se aplique en TODAS nuestras conversaciones, ahora y en el futuro.

## La regla, en palabras simples

### Estado actual: 🔒 TODO BLOQUEADO

Desde este momento, **todo el sitio web está bajo candado**. Esto incluye absolutamente todo:

- Todos los menús del slider lateral (Inicio, Plano, Dashboard, Casas, Tipos de vivienda, Materiales, Recepciones, Entregas, Inventario, Reportes, Vale tipo, Sitios, Configuración)
- Todo lo que contienen esos menús (tablas, formularios, botones, métricas, pop-ups, diálogos)
- Elementos globales (tema claro/oscuro, botón de ayuda flotante, diálogo de contraseña, logo, barra superior)
- Estructura, diseño, código, base de datos, textos

### Cómo se desbloquea

| Lo que tú escribes | Lo que yo hago |
|---|---|
| `bloquea menú [X]` | Pongo candado a ese menú (no toco nada ahí) |
| `desbloquea menú [X]` | Quito el candado, ya puedo hacer cambios ahí |
| `candado a todo el sitio` | Bloqueo TODO |
| `desbloquea todo el sitio` | Quito todos los candados |

### Qué pasa si necesito tocar algo bloqueado

Si tú me pides un cambio que requiere modificar una parte bloqueada (aunque sea de paso, aunque sea un detalle pequeño, aunque sea un pop-up que aparece en otro menú), **paro y te pido permiso explícito antes de tocar nada**. Por ejemplo:

> "Para hacer eso necesito modificar el botón de ayuda, pero está bloqueado. ¿Me autorizas a desbloquearlo solo para este cambio?"

Espero tu autorización. No avanzo hasta que digas "sí, desbloquea X".

### Excepción única: bugs graves

Si el sitio se cae o no se puede entrar, **te aviso primero** y espero tu permiso antes de tocar nada, incluso si es urgente.

## Dónde se guarda esto

Guardo dos cosas en mi memoria permanente del proyecto (`mem://`):

1. **En la regla central (Core):** una línea corta que diga "Todo el sitio bajo candado por defecto. Pedir autorización antes de tocar cualquier cosa bloqueada."
2. **Un archivo de detalle** (`mem://rules/lock-system`) con la tabla completa de comandos y la lista de menús, para consultarlo cuando haga falta.

Así, aunque empecemos una conversación nueva mañana o en un mes, la regla seguirá activa.

## Lo que NO va a cambiar

- Cero archivos de código modificados
- Cero cambios en la base de datos
- Cero cambios visuales en el sitio
- El sitio se ve y funciona exactamente igual que ahora

Solo cambia **cómo yo me comporto** cuando me pidas cosas.
