## Plan: Respaldo completo de la base de datos V2

### Objetivo
Extraer todos los registros de todas las tablas del proyecto actual (V2) y entregártelos en archivos CSV listos para abrir en Excel, Google Sheets o cualquier hoja de cálculo. Incluiremos IDs y llaves foráneas tal como las pides.

### Qué haremos
1. **Listar las tablas** del proyecto actual que pertenecen a tu app (tablas `public`), excluyendo las tablas internas del sistema de Lovable/Supabase que no son tuyas.
2. **Contar registros** de cada tabla para que sepas qué tamaño tiene tu respaldo.
3. **Exportar cada tabla a un CSV** separado, con todos sus campos y todas sus filas, sin cortar nada.
4. **Comprimir todo en un ZIP** y dejarlo en la carpeta de documentos para que lo descargues.
5. **Entregarte un resumen** con la lista de tablas, cantidad de registros y el nombre de cada archivo.

### Tablas incluidas (ejemplos, confirmaremos al exportar)
Tablas operacionales del proyecto: materiales, vales, etapas, casas, sitios, entregas, recepciones, ajustes de inventario, perfiles de usuario, roles, configuración, etc.

### Lo que NO podemos hacer
- Darte una URL de Supabase para abrir con navegador.
- Hacer un "dump" completo de la base de datos en formato SQL (eso no está permitido por Lovable Cloud).
- Revelar ni escribir en el chat la clave de servicio ni credenciales internas.

### Entregables
- Carpeta `/mnt/documents/backup_v2/` con un CSV por tabla.
- Archivo `backup_v2.zip` con todo junto.
- Resumen en texto simple con nombres de tablas y cantidad de registros.

### Tiempo estimado
Unos minutos, dependiendo de cuántos registros tengas.