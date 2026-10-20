# Hogar Encantado

La interfaz usa los personajes de `public/lore.txt` como guías: Mickey en inicio y misiones, Cenicienta en tareas, Ratatouille en comidas y Tío Gilito en ahorro. Los logros muestran las doce ilustraciones de la lámina de stickers que subiste; varios logros comparten una ilustración, pero mantienen sus nombres y condiciones propios. El álbum y los premios muestran también los objetivos pendientes con su ilustración oscurecida y el requisito para desbloquearlos; la vista inicial no concede premios ni puntos. El castillo de `public/castillo/` se ve completo y oscurecido desde el principio; sus capas ganan color con los hitos existentes de **125, 250, 375 y 500 XP acumulados**. Después permanece iluminado mientras continúan los niveles de 500 XP. Los umbrales que venían dentro del ZIP no se aplican.

La navegación separa **Inicio** de **Tareas**. Inicio reúne los destacados de cada sección, el castillo y los logros desbloqueados durante la semana actual; las tareas se cogen y completan en su propia sección. La primera vez que se elige un perfil en un navegador aparece una guía de siete pasos: visión general y las secciones de trabajo. Explica cómo coger tareas, planificar comidas, registrar ahorro, ganar XP y llaves, desbloquear stickers y organizar las pools. Se puede omitir y volver a abrir desde **Cómo funciona** en el menú. La marca de guía vista se guarda por perfil en el navegador; no modifica la base de datos compartida ni concede puntos.

Mickey presenta el estado semanal en Inicio y publica un informe cada domingo a las **19:00, hora de Madrid**. El último domingo del mes añade un cierre con los datos registrados desde el día 1 hasta ese domingo. El informe recuerda fijar las tareas esenciales, el objetivo de esfuerzo y las comidas de la semana siguiente; sus botones abren directamente esa semana. Cenicienta, Ratatouille y Tío Gilito muestran comentarios basados en los datos de tareas, cocina y economía. Los informes son avisos dentro de la app: aparecen cuando está abierta o al volver a entrar, sin notificaciones externas con el navegador cerrado.

**Misiones y premios** siempre muestra sus objetivos. Con el servidor actualizado se ven las tres misiones, el álbum completo y el catálogo aunque el progreso sea cero. Si la respuesta del servidor todavía no incluye los datos cooperativos, aparece una vista de muestra con los objetivos bloqueados y un aviso para actualizarlo; esa vista no permite registrar ni canjear nada. Al cambiar de sección se vuelve al inicio de la pantalla.

Tablero compartido de tareas domésticas para Iván e Irene. Cada persona elige su perfil, coge una tarea libre y la marca como hecha cuando termina. **No se asignan tareas por defecto** en el tablero de pools.

## Arranque local

Requiere Node 24 o posterior.

```bash
npm ci
npm run build
npm run serve
```

Abre `http://localhost:4310/entrada`. El acceso normal recuerda el perfil elegido en ese navegador; `/entrada` vuelve a preguntar quién entra. `npm run serve -- status` comprueba el servidor y `npm run serve -- stop` lo detiene. En desarrollo, `npm run dev` sirve la app y la API desde el mismo proceso.

## Cómo funciona

El tablero incluye las tareas iniciales y **48 opciones** basadas en las 38 actividades de `public/tareas1.txt`. Las tareas que abarcan varias camas o baños se ofrecen por habitación. Todas estas opciones nuevas empiezan libres, sin responsable; las tareas antiguas de mascotas mantienen su estado previo.

| Pool | Disponibilidad tras completarla |
| --- | --- |
| Cada día | Al día siguiente |
| Cada 2–3 días | Tras 3 días completos |
| Cada semana | El lunes siguiente |
| Cada 4 semanas | Tras 28 días |
| Cada mes | El primer día del mes siguiente |

Las tareas quincenales del archivo se muestran en **Cada semana** para poder elegirlas en la semana que corresponda. Las trimestrales y semestrales se muestran en **Cada mes**; su cadencia orientativa aparece al abrir los pasos de la tarea. No se asignan automáticamente.

Cada tarea tiene uno de estos estados compartidos:

1. **Libre:** cualquiera puede pulsar «La cojo».
2. **Cogida:** solo quien la cogió puede marcar «Ya la hice» o devolverla. Otra persona ve quién la tiene. La reserva caduca al día siguiente.
3. **Hecha:** sale de la lista disponible hasta el próximo ciclo. La actividad conserva quién la hizo y cuándo.

El servidor impide que dos personas cojan o completen a la vez la misma tarea. Los cambios se guardan en SQLite y la pantalla se actualiza cada 15 segundos, al recuperar el foco o al volver la conexión. Sin conexión se muestra la última copia del tablero, con las escrituras desactivadas.

## Puntos

Al completar una tarea se obtiene XP según el esfuerzo estimado: **5 XP** hasta 5 minutos, **10 XP** de 6 a 15, **20 XP** de 16 a 30 y **30 XP** a partir de 31 minutos. Los puntos ya registrados se conservan con su valor histórico. Cada **500 XP** el hogar sube un nivel y empieza a construir otro rincón; la XP nunca se gasta. Una tarea de al menos 16 minutos puede marcarse como **«La hicimos juntos»**: la XP se divide entre ambas personas y suma una sola vez al hogar. Coger o devolver tareas no da XP ni se asigna ninguna tarea por defecto.

El marcador puede comenzar una nueva etapa sin borrar las tareas hechas. La fecha de inicio de puntos se guarda en SQLite y en las copias de seguridad; solo las acciones posteriores cuentan en los totales, aunque el historial anterior siga conservado.

En **Organizar** se puede cambiar la pool de una tarea, editarla, activarla o desactivarla, y añadir tareas propias. Los cambios de título, zona o minutos se aplican a partir de ese momento; el historial guarda el título, la zona y los puntos que tenía cada tarea cuando se hizo.

## Comidas y compra

La sección **Comidas y compra** empieza con un recetario vacío. Cada receta se crea con nombre, ingredientes con cantidad y unidad, y una foto opcional. La foto se reduce en el navegador y se guarda como JPEG en SQLite junto con la receta. Se pueden editar recetas; para borrar una que aparece en algún plan, primero hay que quitarla de ese plan.

Cada comida o cena del plan se puede marcar como cocinada desde su fecha hasta hoy: suma **20 puntos** una vez: 10 por cocinar y 10 por cumplir el plan. Un día sin pedido a domicilio se registra explícitamente una vez por hogar y día y suma **5 puntos**. El gasto evitado es una estimación opcional, separada del dinero realmente ahorrado. Estas acciones también cuentan en el proyecto común y la meta semanal.

Si una receta planificada sigue sin marcarse como cocinada tres días después, Ratatouille muestra un aviso con la imagen de cocina, una vez por comida planificada y perfil. En Comidas también se puede marcar **Hoy pedimos**; ese registro muestra el mismo aviso al guardarse, no suma XP y se conserva en las copias de seguridad. Un día no puede figurar a la vez como «sin pedido» y «pedimos». El coste del pedido se apunta aparte en Economía si se quiere reflejar como gasto.

El plan semanal permite elegir una receta para la **comida y la cena** de cada día, navegar entre semanas y dejar huecos sin planificar. La lista **Compra** se genera automáticamente a partir de las recetas de esa semana: si una receta aparece dos veces, sus ingredientes cuentan dos veces. Los nombres iguales se agrupan sin distinguir mayúsculas ni tildes; `kg` se suma con `g`, y `l` con `ml`. Las casillas compradas se comparten entre usuarios y se conservan por semana. Si al editar el plan aumenta la cantidad de un ingrediente marcado, vuelve a quedar pendiente.

La compra ofrece búsqueda y filtros de pendientes o todos los productos. Usa dos columnas en escritorio y una en pantallas estrechas, con casillas grandes para marcar desde el móvil.

## Economía, gastos y ahorro

La sección **Economía y ahorro** reúne cuatro vistas: resumen mensual, ingresos, gastos y objetivos de ahorro. Los ingresos y gastos se registran con importe, fecha y categoría. Un gasto puede repartirse a medias, cargarse a una persona o dividirse con un importe personalizado. El balance cuenta quién pagó frente a la parte que correspondía a cada uno y muestra cuánto debe una persona a la otra. Los pagos entre perfiles reducen esa deuda, sin duplicar ingresos ni gastos. El balance considera todos los meses, aunque el resumen y el historial se filtren por mes.

El resumen muestra ingresos, gastos, ahorro neto registrado y un margen orientativo del mes; este último no sustituye el saldo bancario. Los movimientos del fondo de disfrute cuentan en el ahorro neto para que un traspaso desde los objetivos no se contabilice como dinero libre. Los movimientos financieros se guardan en la misma SQLite compartida y se incluyen en exportaciones e importaciones; las copias antiguas siguen siendo válidas.

La vista **Ahorro y viajes** muestra tres hitos compartidos: **1.000 € Viaje express**, **3.000 € Disney París** y **10.000 € Disney worldwide**. Los objetivos avanzan solo con movimientos de dinero registrados por los usuarios; también se pueden registrar retiradas. La pantalla distingue ese saldo de la estimación de pedidos evitados y muestra el historial de aportaciones.

Cada objetivo desbloquea el plan de reservas al llegar al **60 %**. Desde ese punto se pueden marcar fechas, billetes, hotel y presupuesto; la app registra el avance, sin realizar reservas por sí misma. La primera aportación positiva al ahorro de cada semana suma **10 puntos**, con independencia del importe. Las aportaciones siguientes de esa semana no duplican el bonus.

## Centro de mando y juego compartido

El inicio muestra limpieza, comidas, compra y ahorro. Cuatro hábitos diarios sirven de guía compartida sin asignar tareas. La pestaña **Hogar Co-op** añade tres misiones por semana: esfuerzo de limpieza y tareas esenciales acordadas, una misión de cocina y una de equipo. Podéis elegir para cocina entre planificar cinco comidas con la compra lista o siete días sin pedido con cinco comidas caseras. Para equipo podéis elegir entre una reunión con aporte real al ahorro o una limpieza conjunta. Cada misión conseguida da **una llave**, con un máximo de tres por semana; algunos logros extraordinarios dan otra llave una sola vez. El objetivo de XP y las tareas esenciales se pueden ajustar sin asignar responsables.

El álbum contiene logros persistentes de limpieza, cocina, ahorro y equipo. Un sticker desbloqueado puede elegirse como emblema de la app y se ve igual en ambos perfiles. También se pueden registrar gestos concretos que suelen quedar invisibles: revisar despensa, preparar raciones, aprovechar alimentos, compras con lista y una reunión de equipo. Cada tipo tiene un límite diario o semanal para evitar acumular XP repitiendo registros. La limpieza conjunta registrada como sesión reparte su XP entre ambos; si corresponde a una tarea de la pool, usad **«La hicimos juntos»** para no anotar el mismo trabajo dos veces.

Una receta se puede valorar con una a cinco estrellas después de cocinarla. El logro **Recetario en expansión** exige cocinar y valorar cinco recetas distintas; las valoraciones y la foto permanecen en la copia de seguridad.

**Carga compartida** se desbloquea cuando ambas personas confirman dos semanas que el reparto fue justo según su disponibilidad y se hizo al menos la mitad del esfuerzo acordado. No se impone una proporción entre perfiles. **Objetivo protegido** permite acordar una meta de ahorro mensual opcional; si el mes termina con ahorro neto suficiente, concede dos llaves una vez al cerrarlo. Así una retirada posterior durante el mes puede reducir el progreso antes de entregar el premio. Ninguna meta de dinero viene preasignada.

Las llaves se canjean por planes compartidos, gratuitos o con un coste declarado. Los planes con coste necesitan saldo en el **fondo de disfrute**, que se alimenta mediante traspasos desde el ahorro real registrado: reducen el objetivo de ahorro en la misma cantidad y están limitados inicialmente al 25 % de las aportaciones positivas del mes. La app registra el canje y el coste; no hace compras ni reservas. El descanso básico nunca depende de las llaves.

## Datos y copias

La base SQLite está en `data/casa.sqlite`, o en la ruta indicada por `DATABASE_PATH`. El endpoint `GET /api/export` entrega una copia JSON del plan, las pools, las tareas cogidas, los puntos, el historial, las recetas con fotos, el plan de comidas, la compra, los ingresos, gastos, pagos entre perfiles, ahorro, misiones, llaves, logros, fondo y canjes. El endpoint de importación acepta también copias antiguas sin datos de pools, comidas, finanzas, ahorro o Hogar Co-op.

La aplicación no tiene contraseñas: cualquier persona con acceso a su dirección puede consultar o modificar los datos, incluidos ingresos y gastos. Comparte la dirección solo con quienes deban tener acceso a esa información. Para móviles en la red local, configura `HOST=0.0.0.0` y abre la dirección de red que imprime el servidor. El equipo que aloja SQLite debe permanecer encendido. Para usar la PWA desde una IP local se necesita un origen seguro (HTTPS); el tablero compartido funciona por HTTP local.

## Despliegue

El proyecto incluye `Dockerfile`, configuración de Caddy en `deploy/` y `render.yaml`. En producción, sirve la app con `npm start`, conserva `DATABASE_PATH` en un volumen persistente y configura `PUBLIC_URL` con el origen HTTPS real. SQLite está diseñado aquí para una sola instancia del servidor.

En Render, el servicio usa el plan `starter` con un disco de 1 GB montado en `/var/data`; `DATABASE_PATH` debe valer `/var/data/casa.sqlite` también en el panel si el servicio se creó manualmente. El arranque rechaza rutas ausentes o fuera de `/var/data` para evitar guardar puntos y tareas en el almacenamiento temporal. El control `/api/health` comprueba que SQLite se abre; para comprobar que el disco conserva datos, registra una acción desde cada perfil y verifica el resultado tras reiniciar el servicio.

Si tienes datos de la fase temporal sin disco, descarga antes `/api/export` y, después de activar la ruta persistente, importa la copia desde la app. Render no traslada automáticamente el archivo SQLite temporal al disco.

## Comprobación

```bash
npm run build
npm test
npm run test:browser
```

La prueba de navegador necesita Chromium y permiso para abrir un puerto de loopback. Las pruebas de API usan SQLite temporal y ejercitan el manejador HTTP sin abrir un puerto.
