## 🧠 Análisis de V3 — listo para el remix

Leí los dos documentos completos (PDF + prompt). Esto es lo que vamos a hacer **en el proyecto remix**, no acá. V2 queda intacta para que tus amigos sigan testeando.

---

## ✅ Lo que está claro del PDF y tu prompt

- **Una constructora, varias obras** separadas (sitios, vales, recepciones, entregas, inventario, reportes y stock por obra).
- **7 fases** estrictas, una a la vez. No se avanza a la siguiente sin terminar la anterior.
- **Único usuario inicial:** `superadmin.controlobra@gmail.com` (tú). Nadie más entra a V3.
- **5 roles** (Superadmin Técnico / Admin General / Admin de Obra / Operador / Consulta).
- **Sin registro público.** Solo invitación desde la app.
- **RLS en todo**, validación servidor + base de datos.
- **Stock único por obra** + interruptor global "permitir negativo" (apagado por defecto).
- **Operaciones transaccionales** (todo o nada), pero que avise si es nada.
- **Historial real, respaldos, e "Inicializar obra"** ultra-protegida.
- **Limpieza de secretos**: `.env` fuera del repo, `.env.example` limpio.

---

## 📋 Prompt extendido para usar en el remix V3

Cuando hagas el remix y abras chat conmigo allá, pégame este bloque tal cual:

```text
Soy el Superadmin Técnico (superadmin.controlobra@gmail.com).
Trabajaremos V3 siguiendo el "Informe de cierre por fases V3" y el "prompt v3"
que ya analizaste en V2. Reglas:

1. SOLO YO uso V3. Mis amigos siguen en V2.
2. Trabajo estrictamente por fases (1 → 7). No saltar.
3. Antes de cada fase: plan detallado con tablas, archivos, migraciones,
   riesgos y pruebas. Apruebo o corrijo. Recién ahí construyes.
4. Al terminar cada fase: resumen, archivos modificados, migraciones,
   riesgos pendientes, pruebas y resultados.
5. Idioma español, explicación nivel niño de 5 años, soy de los 90.
6. Nunca contraseñas ni correos hardcodeados como condición de acceso.
7. Mantener look & feel "Boutique Café" claro/oscuro de V2 salvo cuando
   haya que corregir por seguridad, datos o cálculos.

TE FALTO INDICAR LAS REGLAS QUE HEMOS CREADO A LO LARGO DE ESTE CHAT
```

---

## ⚠️ Cosas que NO están explícitas en el PDF/prompt y que conviene decidir antes de empezar Fase 1

Estas son las "dudas razonables" que el informe no resuelve. Para Fase 1 algunas son urgentes, otras pueden esperar:

### 🔴 Urgentes (decidir antes de Fase 1)

1. **¿Catálogo de materiales global o por obra?**
  - El informe dice "catálogo general, stock por obra". Hay que confirmar: ¿los precios/unidades son iguales entre obras o cada obra puede tener su propio precio del mismo material? LOS MATERIALES SON POR OBRA, NO HAY PRECIOS POR AHORA, TODO DEPENDE SI ME LO PIDE LA EMPRESA, ESTO ESTA TOTALMENTE ENFOCADO A BODEGA
2. **¿Qué hacer con la tabla actual `materials_v2`?**
  - Hoy es global. ¿La dejamos global y solo el stock se separa por obra? (recomendado y coincide con el informe). TODO ES POR OBRA, DEJA UNA OPCION EN SUPERUSUARIO PARA COPIAR O TRASPASAR SOLO LOS MATERIALES DE UNA OBRA A OTRA SIN STOCK
3. **Datos huérfanos al migrar.**
  - Si en V2 hay filas sin dueño claro (ej. recepciones de pruebas de tus amigos), ¿se migran todas a la "Obra inicial" o las marcamos para revisar? SE MIGRAN TODAS OBRA INICIAL
4. **¿Borramos la passphrase compartida actual de una?**
  - V2 usa contraseña de obra. En V3 ya no existe. Hay que sacarla del código apenas migremos al nuevo login. SI. TODAS LAS CONTRASEÑAS LAS DARE YO COMO SUPERUSUARIO, (sin contraseñas: agregar, consultar, modificar)

### 🟡 Importantes (decidir en Fase 2)

5. **MFA / 2FA en tu cuenta Superadmin.**
  - El informe lo recomienda. ¿Lo activamos desde el día 1 o más adelante? MAS ADELANTE
6. **Reautenticación reciente: ¿cuánto es "reciente"?**
  - El informe la exige para acciones destructivas. Propongo 5 minutos. OK CON POSIBILIDAD DE CAMBIAR POR EL SUPERUSUARIO
7. **Invitaciones por correo.**
  - ¿El sistema envía correo de invitación con link, o tú generas un usuario y entregas la contraseña inicial a mano? NOS E COMO FUNCIONA ESO, DEBERAS EXPLICARME COMO FUNCIONAN AMBAS PARA TOMAR UNA DESICION

### 🟢 Para más adelante (Fases 4-7)

8. **Stock negativo: ¿alerta también por correo o solo en pantalla? PANTALLA**
9. **Respaldos: ¿automáticos cada cuánto, o solo manuales del Superadmin? ESTO TRABAJA EN LA NUBE CIERTO? PODRÍA SER TODOS LOS DIAS A LAS 3 AM HORA CHILE, SINO ES ASÍ LO DEJAMOS PARA MAS ADELANTE, HABRIA QUE VER LO MAS RECOMENDABLE**
10. **Historial: ¿hasta cuántos meses se guarda? ¿se purga alguna vez? NORMALMENTE UNA CONSTRUCCION DE ESTE INDOLE ES DE UNA DURACION DE 1 AÑO Y 6 MESES, HABRIA QUE VER QUE ES LO MAS RECOMENDABLE**
11. **Reportes exportables: ¿PDF, Excel, ambos? SI**
12. **Selector de obra: ¿persiste entre sesiones o se elige cada vez que entras? SE ELIGE CUANDO INGRESO, DDEBO TENER UN DASHBOARD PARA MI Y DESDE AHI SELECCIONAR LA OBRA.**

### 🛡️ Seguridad extra que el PDF no menciona pero conviene

13. **Rate limiting** en login (para que nadie haga ataques de fuerza bruta). SI
14. **Política de contraseñas:** mínimo 12 caracteres + HIBP (chequeo de contraseñas filtradas — Lovable Cloud lo soporta nativo). SI
15. **Logs de sesión:** quién entró, desde dónde, cuándo. SI
16. **Bloqueo automático** de sesión tras X minutos sin actividad. SI, BLOQUEO EN 10 MIN

---

## 🚦 Estado actual

- **No tocaré nada** en V2 ahora.
- V2 sigue funcionando para tus amigos testers.
- Cuando hagas el remix de V3 y me escribas allá, arrancamos con la **Fase 1: Base de obras y migración de datos** — y antes de tocar la base de datos te muestro el plan detallado para aprobar.

---

## 📝 Pasos para ti (en orden)

1. Lee este análisis y dime si algo está mal entendido o falta.
2. Decide al menos las 4 preguntas 🔴 urgentes (puedes responderlas acá).
3. Ve a Lovable → menú del proyecto → "Remix" → nombre sugerido: **"Control de Obra V3"**.
4. Abre el chat del nuevo proyecto V3 y pega el prompt extendido de arriba.
5. Allá te pediré las decisiones que falten y te mostraré el plan de Fase 1.