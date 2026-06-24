# Dossier visual: capturas reales de cada pantalla con descripción

Voy a generar una **segunda versión** del dossier, centrada en lo visual: una captura real de cada pantalla del sitio, acompañada de una descripción clara (lenguaje normal + nota técnica corta). Esto complementa el dossier técnico que ya entregué — no lo reemplaza.

---

## Cómo lo voy a hacer (te lo explico paso a paso)

1. **Inicio sesión en el sitio dentro del sandbox** usando la sesión ya inyectada (no necesito tu contraseña).
2. **Recorro cada sección** del menú lateral con un navegador automático (Playwright), una por una.
3. **Tomo una captura** de cada pantalla a tamaño escritorio (1280px de ancho), en tema claro.
4. Para las pantallas con **modales importantes** (ej. detalle del Simulador, editar material, cascade delete, passphrase), abro el modal y tomo una captura extra.
5. Reviso cada captura: si salió cortada, en blanco o con un error, repito.
6. Armo el documento final con captura + descripción debajo de cada una.

---

## Qué pantallas voy a capturar (orden del menú)

1. Login (`/auth`)
2. Recuperar contraseña (`/reset-password`)
3. Dashboard
4. Casas (tipos de vivienda)
5. Sitios
6. Plano (vista grilla por manzana)
7. Vale Tipo
8. Materiales (catálogo `materials_v2`)
9. Recepciones (lista + form con validación de guía G-####/F-####)
10. Entregas (lista + form, manual y desde vale)
11. Inventario (conteos y ajustes)
12. Reportes
13. Simulador (tabla + **modal de detalle** + botones export PDF/Excel)
14. Configuración (incluye Historial con diff)
15. Usuarios (solo superadmin)
16. Ayuda

Modales/diálogos extra: passphrase de obra, cascade delete con confirmación, edit dialog, quick-create de material, searchable-select abierto.

---

## Qué contiene cada ficha de pantalla

Por cada captura, incluyo:

- **Nombre de la sección** y ruta del menú.
- **Captura real** (PNG, escritorio 1280px).
- **Descripción normal**: para qué sirve esta pantalla, qué ve el usuario, qué puede hacer.
- **Datos que muestra**: de dónde salen (tabla o vista de la base, en una frase).
- **Acciones disponibles**: botones principales (crear, editar, borrar, exportar).
- **KPIs / estadísticas visibles**: qué número aparece y cómo se calcula (fórmula corta).
- **Notas de uso**: reglas relevantes (ej. "la guía debe ser G-#### o F-####", "búsqueda por tokens", "paginación 10").

---

## Formato de entrega

- `/mnt/documents/dossier_visual/` — carpeta con:
  - `00_indice.md` — índice con miniaturas.
  - `screenshots/` — todos los PNG originales.
  - Un `.md` por pantalla con la ficha completa.
- `dossier_visual.pdf` — PDF consolidado (portada + índice + una pantalla por página o sección, con la captura grande y la descripción debajo).
- `dossier_visual.zip` — todo empaquetado para enviar.

El estilo del PDF respeta la paleta "Boutique Café" del sitio para que se vea coherente con el dossier técnico anterior.

---

## Lo que NO incluye

- No repite el contenido técnico profundo del dossier anterior (stack, base de datos, RLS, server functions) — eso ya está en `dossier_completo.pdf`. Acá el foco es **ver el sitio** y entender cada pantalla de un vistazo.
- No expongo datos sensibles que aparezcan en pantalla: si veo correos reales o nombres de personas, los difumino antes de incluir la captura.
- No modifico nada del sitio ni de la base: solo navego y fotografío.

---

## Pregunta antes de avanzar

¿Prefieres que las capturas sean en **tema claro** (más legible impreso), en **tema oscuro** (como sueles trabajar), o **ambos** (dos versiones del PDF)?

Si no me dices nada, lo hago en **tema claro** por defecto.
