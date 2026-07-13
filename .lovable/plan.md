## Plan: Agregar "Nuevo vale tipo" en la pestaña Vales tipo

### Sobre el menú Casas
Revisé el código y el menú **Casas** ya está **desbloqueado** y funcionando (aparece en el sidebar y abre las pestañas *Tipos / Manzanas-Sitios / Vales tipo*). No hay nada que "abrir": ya puedes entrar. Si al hacer clic no lo ves, cuéntame qué te aparece y lo miro.

### Lo que voy a agregar
Dentro de **Casas → pestaña "Vales tipo"**, al principio del panel (arriba de los selectores) sumaré una fila nueva con un botón grande:

> **➕ Nuevo vale tipo**

Al hacer clic se abre un diálogo pequeño que pide **solo un dato**:

- **Nombre del vale** (ej: "PINTURA EXTERIOR TERRAZA")

Y opcionalmente:
- **Sección** (texto libre — el campo ya existe en la base para agrupar; lo dejo opcional)

### Cómo se genera el código automáticamente
- Miro todos los códigos actuales (V01, V02… V49).
- Tomo el número más alto y le sumo 1 → siguiente = **V50**, luego V51, etc.
- Siempre con la letra **V** y **2 dígitos** con cero adelante (V07, V50, V123 si algún día crecen).
- Si en el futuro hay un hueco (por ejemplo se borró V10), igual se usa el siguiente al máximo, para no reciclar códigos ya usados en históricos.

El usuario **no ve ni edita** el código: aparece pintado como "vista previa" dentro del diálogo (ej: *"Se creará como V50"*), y al guardar se inserta con ese código.

### Cómo se guarda
- Uso el flujo administrativo existente (`adminMutateFn` con `action: "insert"` sobre `vale_types_v2`), así queda registrado en el **historial** igual que las demás modificaciones y pide la **contraseña de obra** como el resto de acciones sensibles.
- `sort_order` = siguiente al máximo actual, para que aparezca al final de la lista ordenada.
- Después de crear, se selecciona automáticamente el nuevo vale en el selector para que puedas empezar a agregarle **etapas** y **materiales** enseguida.

### Lo que NO cambia
- Los vales existentes, sus etapas, materiales y códigos se mantienen intactos.
- Nada más de la sección se toca (los botones actuales de imprimir, copiar vale, etc. siguen igual).

### Duda mínima
¿Quieres que también pida la **sección** (agrupador), o simplemente lo dejamos vacío y lo editas después si hace falta? Por defecto voy con **solo el nombre** para que sea rápido.

¿Confirmas y avanzo?
