# Casa al día

Aplicación de limpieza doméstica para Iván y Irene, ambos renombrables. React + TypeScript, servidor Node y SQLite persistente. El plan original está en `app.txt`; por petición posterior, el acceso actual es directo, sin login ni contraseña. No utiliza IA ni servicios de pago, no pide permisos de notificaciones y no opera sobre el chip NFC.

## Arranque local

Requiere Node **24 o posterior** y npm. Desde el directorio del proyecto:

```bash
npm ci
npm run build
npm run serve
```

Abre **http://localhost:4310/entrada** y selecciona persona. No necesitas contraseña ni crear una cuenta. El acceso normal `/` recuerda el perfil elegido; `/entrada` pregunta siempre quién eres.

En este equipo ya están preparadas las dependencias y el build: basta con `npm run serve`. Arranca el servidor en segundo plano, guarda el registro en `data/runtime/server.log` y comprueba que la entrada y la API respondan. Puedes cerrar la terminal después del arranque. No configura el inicio automático tras reiniciar el ordenador; en ese caso vuelve a ejecutar el comando. Los archivos de contraseña y las cookies de versiones anteriores ya no se utilizan.

Para comprobarlo o detenerlo conservando los datos:

```bash
npm run serve -- status
npm run serve -- stop
```

Para actualizar la aplicación después de modificar el código, detén el servidor, ejecuta `npm run build` y arranca con `npm run serve`.

El puerto 4310 evita los puertos de otros proyectos del equipo. Para desarrollar con recarga automática, detén primero el servidor de segundo plano y ejecuta `npm run dev`; Vite y API se sirven desde el mismo proceso y origen. Este modo necesita mantener la terminal abierta. También puedes comprobar el build estático en primer plano:

```bash
npm run build
SERVE_BUILD=1 npm run dev
```

La PWA y el service worker se activan con el build estático. En desarrollo Vite no registra el worker. Una instalación previa de la PWA puede servir la última versión compilada si cambias entre ambos modos; usa las herramientas del navegador para desregistrar el worker al desarrollar.

## Abrir desde el móvil por la red local (sin dominio)

En `.env`, establece:

```dotenv
HOST=0.0.0.0
PORT=4310
```

Elimina o comenta cualquier `PUBLIC_URL=http://localhost:4310` para que el servidor detecte automáticamente la IP privada del ordenador. Reinicia ejecutando `npm run serve -- stop` y después `npm run serve`: mostrará una dirección como `http://192.168.190.50:4310/`. Abre la dirección exacta que imprima, con **http**, desde un móvil conectado a la misma red. El ordenador debe permanecer encendido y el servidor en marcha.

Si tiene varias tarjetas de red o la detección elige otra interfaz, establece también `PUBLIC_URL=http://IP_DEL_ORDENADOR:4310` y reinicia. El enlace de Ajustes/QR y el origen permitido para guardar utilizarán esa dirección. No necesitas abrir puertos en el router para acceder dentro de casa.

Si el enlace funciona en el ordenador pero no desde el móvil, comprueba que no estás en una Wi-Fi de invitados con aislamiento entre dispositivos y que el firewall del ordenador permite TCP 4310 desde tu red local. La instalación PWA, el service worker y la copia automática al portapapeles necesitan un contexto seguro; el uso normal de tareas compartidas funciona por HTTP local. Para disponer de esas funciones desde la IP necesitarás HTTPS.

## Funciones

- Entrada directa sin contraseña. `/entrada` vuelve a preguntar la persona en cada navegación, aunque exista preferencia; el acceso normal `/` recuerda el perfil.
- Hoy: tareas diarias, plan del día y pendientes agrupados, pasos desplegables, responsables y minutos orientativos. Vista propia o de los dos.
- Semana de lunes a domingo, navegación a semanas anteriores o futuras, vista compartida e historial con filtros por persona, tarea, zona y fechas.
- Acciones: completar, deshacer, asumir, mover, omitir con motivo y editar título, pasos, zona y tiempo de una ocasión concreta. La edición completa del plan (pasos, zona, tiempo, recurrencia, bloque, responsable fijo y activación) se hace desde Ajustes con confirmación de alcance.
- Reparto habitual fijo y equilibrado entre Iván e Irene. Lavavajillas y basura son de Iván; el salón se barre y friega los martes por Irene. Los extras de sábado alternan responsable mediante bloques A/B desde el 12/10/2026 y siguen un ciclo de cuatro semanas. Las tareas con responsable fijo no cambian al rotar. Habitaciones pueden pasar a quincenales; mascotas desactivadas inicialmente.
- Ausencias: vista previa de las ocasiones afectadas y confirmación separada para reasignar. Guardar la ausencia por sí sola no cambia el reparto. Si la otra persona también está ausente, se rechaza la reasignación. Una ausencia ya registrada permanece en el historial; el MVP no incluye cancelación de ausencias desde la interfaz.
- Exportación JSON versionada sin sesiones ni secretos. Importación con validación de esquema y referencias, vista previa, recuentos, confirmación de sustitución total y transacción SQL.
- QR generado localmente desde `PUBLIC_URL/entrada`, manifest e iconos para instalar en pantalla de inicio.

## Reparto vigente desde el martes 13/10/2026

Cada día, Iván gestiona platos/lavavajillas y revisa/saca la basura si hace falta. Irene repasa encimera y placa, recoge el salón y limpia la mesa. Son unos 15 y 16 minutos orientativos respectivamente, no duraciones obligatorias.

| Día | Iván | Irene |
| --- | --- | --- |
| Lunes | Baño 1 y cambio de toallas de ambos baños | Baño 2 |
| Martes | Lavar ropa y tender/secar (ocasiones separadas) | Barrer y fregar el salón |
| Miércoles | Polvo y aspirado de habitaciones 1 y 2 | Habitación 3, polvo de salón/comedor y aspirado del sofá |
| Jueves | Cocina a fondo | Revisar alimentos, frentes y suelo de cocina |
| Viernes | Aspirar y fregar habitaciones | Repasar lavabos/WC y doblar/guardar ropa |
| Sábado | Cambiar y lavar sábanas; recoger zonas comunes | Tender/secar sábanas; barrer y fregar comedor y pasillo |
| Domingo | Mantenimiento diario | Mantenimiento diario |

El extra del sábado alterna entre ambos. Sin el extra, el plan suma 260 min/semana para Iván y 270 para Irene. En las cuatro semanas del ciclo: Iván 280/260/290/260 e Irene 270/290/270/290 minutos estimados, aproximadamente 49 %/51 % del total. Los dos tienen baños, suelos o limpieza a fondo. La vista Semana muestra los tiempos previstos, excluyendo ocasiones omitidas y cubiertas.

La limpieza del salón del martes 13/10/2026 se registró como hecha por Irene tras la confirmación del usuario, con hora de registro del servidor. No se marcaron hechos comedor ni pasillo. Se conservaron completados anteriores y los responsables originales en el historial, actualizando las tareas pendientes fijas. El cambio está implementado para futuras instalaciones en `server/household-plan.mjs`; `scripts/rebalance-household.mjs` contiene el ajuste puntual idempotente aplicado a la base existente. No se ejecuta en cada arranque ni sobrescribe cambios posteriores de Ajustes.

## Reglas de datos y sincronización

`server/migrations/001_initial.sql` crea el esquema; `server/seed.mjs` carga las dos personas, diez zonas y 34 plantillas. La inicialización es transaccional y solo ocurre sobre una base vacía. Una restricción única por plantilla y fecha original hace idempotente la generación.

Las fechas domésticas son `YYYY-MM-DD` en Europe/Madrid. La semana se calcula por diferencia de lunes respecto a la fecha base, incluyendo offsets negativos; no depende de la paridad ISO. Los eventos y completados usan timestamps UTC del servidor. Se generan las ocasiones al consultar, desde la primera fecha de vigencia hasta el intervalo pedido; no es necesario abrir la aplicación todos los días. El máximo por consulta es de diez años.

El frontend consulta cada 15 segundos mientras está visible y vuelve a consultar al recuperar el foco o la conexión. Las escrituras solo se presentan como guardadas tras recibir confirmación. Todas las acciones requieren versión vigente, transacción e identificador de idempotencia. Un conflicto devuelve HTTP 409 y actualiza los datos. Un reintento de la misma petición devuelve su resultado sin duplicar eventos.

Los pendientes se agrupan por plantilla. Completar la última ocasión requiere confirmar qué anteriores se cubren. Se registra una sola limpieza; las demás quedan como «cubiertas por limpieza posterior» y no suman actividad ni minutos. Deshacer reabre esas ocasiones. Mover conserva la fecha original y suprime las repeticiones no modificadas del intervalo aplazado, aunque se hubieran generado al consultar Semana. Las ocasiones con excepciones manuales se conservan.

Modificar el plan conserva completados y sus snapshots, las ocasiones pasadas y las excepciones individuales. Actualiza las abiertas desde hoy. Al desactivar una plantilla o cambiar su calendario, las repeticiones futuras sin excepciones quedan canceladas, sin borrar datos históricos. El resumen semanal cuenta limpiezas efectivas según fecha de actividad en Madrid; cubiertas, omitidas y deshechas no suman. Los minutos son estimaciones, nunca tiempo medido.

Sin conexión se muestra el **último tablero consultado** guardado en ese navegador. Se desactivan escrituras; no hay cola offline. El historial remoto requiere conexión. El service worker solo guarda HTML y recursos estáticos y excluye `/api/`. Los datos del tablero van a una caché local separada que puede eliminarse borrando los datos del sitio en el navegador.

## Acceso compartido

La aplicación ya no tiene autenticación: cualquiera que pueda alcanzar su dirección puede consultar y editar el hogar. Está configurada para usarla en vuestra red local. Elegir un perfil únicamente atribuye actividad; no restringe permisos.

Se mantienen la validación del origen de las escrituras del navegador, las cabeceras JSON propias, el control de versiones, las transacciones y los reintentos idempotentes. No se crean cookies de sesión. Los campos y tablas de autenticación que puedan quedar de una instalación anterior no se consultan ni se exportan.

## Variables de entorno

| Variable | Desarrollo | Producción |
| --- | --- | --- |
| `PORT` | `4310` | Puerto interno del servidor |
| `HOST` | `127.0.0.1` | `0.0.0.0` dentro del contenedor |
| `DATABASE_PATH` | `./data/casa.sqlite` | Ruta sobre volumen persistente |
| `PUBLIC_URL` | IP local detectada con `HOST=0.0.0.0`; localhost en otro caso | **Origen HTTPS real**, sin ruta ni barra final |
| `NODE_ENV` | Sin establecer | `production` |
| `SERVE_BUILD` | `1` para probar el build sin Vite | No hace falta |
| `CASA_DOMAIN` | No se usa | Dominio real, solo para Docker/Caddy |

`.env.example` sirve de referencia; `.env` nunca se sube al repositorio. Producción requiere `PUBLIC_URL` HTTPS. `HOUSEHOLD_PASSWORD_HASH`, si quedó en un `.env` anterior, ya no se utiliza.

## Despliegue en Render

Crea un **Web Service**, con lenguaje **Node**, desde el repositorio `carmona11111/casaapp` y la rama `main`. La aplicación necesita su servidor y SQLite; un Static Site no ejecuta la API. Render proporciona un subdominio HTTPS `onrender.com`, por lo que no necesitas comprar un dominio.

Configura estos campos:

| Campo | Valor |
| --- | --- |
| Root Directory | Vacío (raíz del repositorio) |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/entrada` |
| Instancias | Una |

Variables de entorno:

| Variable | Valor |
| --- | --- |
| `NODE_VERSION` | `24` |
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `DATABASE_PATH` | `/var/data/casa.sqlite` |
| `PUBLIC_URL` | La URL HTTPS exacta asignada al servicio, por ejemplo `https://casaapp-xxxx.onrender.com`, sin ruta ni barra final |

Render establece `PORT` automáticamente; la app lo utiliza. No copies el `.env` local ni añadas el token de GitHub como variable de la app. Si la URL definitiva se conoce después de crear el servicio, actualiza `PUBLIC_URL` con ella y vuelve a desplegar.

Añade un **disco persistente de 1 GB**, con Mount Path **`/var/data`**, antes de utilizar la app. Requiere un servicio de pago compatible con discos: el servicio gratuito no conserva SQLite entre reinicios o despliegues. El disco y el servicio tienen coste; consulta el importe que muestra Render antes de crearlos.

La primera instalación inicia el plan de Iván e Irene, pero el historial de la instalación local no se sube a GitHub. Para trasladarlo, exporta JSON desde Ajustes en la app local e impórtalo desde Ajustes en Render. Desde ese momento, usad ambos la misma URL de Render: la base local y la remota son independientes.

El acceso sigue siendo directo, sin login, tal como está configurado. En una URL pública, cualquiera que alcance esa dirección podrá consultar y modificar las tareas; seleccionar persona no limita el acceso.

Referencias oficiales: [Web Services](https://render.com/docs/web-services), [discos persistentes](https://render.com/docs/disks) y [versión de Node](https://render.com/docs/node-version).

## Despliegue HTTPS en un servidor propio

No hay un hosting contratado/configurado ni una URL publicada en esta entrega. `localhost` en un móvil apunta a ese móvil, no al equipo donde está SQLite. Para compartir desde un servidor propio con la configuración siguiente hace falta **un servidor accesible, dominio con DNS, HTTPS y disco persistente**. No publiques solo `dist/`: necesita su API y SQLite. Para usar el subdominio de Render, sigue la sección anterior.

Se incluyen Dockerfile y Docker Compose con Caddy como terminador TLS. En un servidor con Docker Compose:

1. Copia el proyecto sin `node_modules`, `.env` ni `data` privados, o transfiere una copia de datos de forma privada si ya contiene vuestro historial.
2. Configura el DNS del dominio hacia la IP pública del servidor y permite TCP 80/443. El puerto de Node no se expone públicamente.
3. Crea `.env` con estas líneas, sustituyendo el dominio de ejemplo por el real:

   ```dotenv
   PUBLIC_URL=https://casa.tu-dominio.example
   CASA_DOMAIN=casa.tu-dominio.example
   ```

4. Desde la raíz del proyecto:

   ```bash
   docker compose --env-file .env -f deploy/compose.yaml up -d --build
   docker compose --env-file .env -f deploy/compose.yaml logs --tail=80
   ```

5. Comprueba `https://TU_DOMINIO_REAL/entrada` en ambos móviles, elige una persona en cada uno y completa una tarea. En el segundo, recupera el foco o espera hasta 15 segundos. Verifica el historial compartido antes de grabar la etiqueta.

SQLite funciona en un único servidor/proceso con su volumen. No montes el archivo sobre almacenamiento efímero ni ejecutes réplicas independientes. Caddy necesita acceso público al dominio para emitir certificados. La configuración de contenedores no se ha ejecutado en este entorno.

Si ya dispones de proxy HTTPS, también puedes ejecutar `npm ci`, `npm run build` y `npm start`, con las variables de producción y un supervisor de procesos. Haz que el proxy reenvíe todas las rutas, incluida `/api/`, al puerto 4310 y conserva `data/` entre reinicios.

## NFC, QR e instalación

En Ajustes se muestran el enlace real configurado y su QR; en desarrollo se identifica como dirección local. Instala la PWA desde la función «Añadir a pantalla de inicio» del navegador como acceso alternativo.

Para la nevera usa una etiqueta **on-metal**. En una app de escritura NFC:

1. Añade un registro **NDEF URI** con la URL HTTPS terminada en `/entrada` que muestra Ajustes.
2. Graba únicamente esa URL, sin contraseña ni token de sesión.
3. Pruébala en ambos móviles y abre la misma URL manualmente para comparar el comportamiento.
4. Verifica antes de bloquear la etiqueta; bloquear suele impedir editarla posteriormente. La aplicación no bloquea etiquetas.

El móvil puede mostrar una notificación que hay que tocar para abrir la web. No se promete apertura automática. No hay pantalla de login. La selección de persona se muestra siempre al entrar por `/entrada`.

## Persistencia y copias de seguridad

Los datos residen en `data/casa.sqlite` (o `DATABASE_PATH`), con WAL y claves foráneas. En Docker se usa el volumen `casa_data`; reiniciar/reconstruir no lo borra. **No uses `docker compose down -v` para una actualización**, porque elimina volúmenes.

La opción Exportar JSON de Ajustes produce una copia portable del plan, personas, zonas, ocurrencias, eventos y ausencias. Importar reemplaza el contenido del hogar después de la vista previa; exporta antes la situación actual si quieres poder volver atrás. Las sesiones y el hash de contraseña no se importan.

Para una copia SQL completa en caliente, si tienes el CLI de SQLite:

```bash
mkdir -p backups
sqlite3 data/casa.sqlite ".backup 'backups/casa.sqlite'"
```

Alternativamente, detén el servidor y copia el archivo SQLite y, si existen, sus archivos `-wal` y `-shm` como un conjunto. Copia de forma privada `.env` por separado. No copies únicamente el archivo principal mientras se esté escribiendo en WAL. Conserva backups fuera del equipo. Para restaurar SQL, detén la app, restaura el conjunto consistente, ajusta permisos y arranca de nuevo; los datos del hogar seguirán disponibles; las tablas de sesiones antiguas, si existieran, se ignoran.

## Pruebas y estado de verificación

```bash
npm run build
npm test
```

La compilación TypeScript/Vite y **25 pruebas automatizadas** pasan. Cubren rotación, cambio de año, Madrid/horario de verano, recurrencias, generación idempotente, acciones, conflictos, agrupación sin inflar actividad, movimiento antes/después de generar semana, snapshots, persistencia tras cerrar SQLite, dos clientes sin cookies, validación de origen, idempotencia, ausencias, importación/exportación, acceso LAN, retirada de las rutas de login, asignaciones fijas, carga equilibrada durante cuatro semanas y registro único del salón sin completar otras zonas.

Las pruebas de API ejecutan el manejador HTTP real con streams en memoria y SQLite temporal: no sustituyen el servidor por respuestas inventadas. Se ha verificado el arranque en segundo plano mediante `npm run serve` y su continuidad mediante `npm run serve -- status`, con respuestas HTTP 200 reales de `/entrada` y `/api/state`. La verificación con navegador y móviles reales queda pendiente. No hay despliegue público.

Se deja además una prueba de navegador reproducible, con servidor y base temporal, sin modificar vuestro hogar:

```bash
npx playwright install chromium
npm run test:browser
```

Comprueba `/entrada` sin login → persona → completar → otro navegador; recarga; `/entrada` con perfil recordado; copia offline sin escrituras; QR; ausencia de desbordamiento a 390 px; capturas móvil y escritorio. Puede usarse un Chromium instalado con `CHROMIUM_PATH=/ruta/al/chromium npm run test:browser`. **Esta prueba queda pendiente de ejecutar en un host que permita puertos y navegador.** También quedan por comprobar NFC físico, instalación en iOS/Android y el despliegue HTTPS real.

No se implementan push, autenticación individual ni escritura offline. La edición individual permite cambiar título, pasos, zona y tiempo; la frecuencia pertenece a la plantilla futura. Las ausencias no incluyen aún un flujo de cancelación desde la interfaz.
