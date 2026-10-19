# Hogar Encantado

La interfaz usa los personajes de `public/lore.txt` como guías: Mickey en inicio y misiones, Cenicienta en tareas, Ratatouille en comidas y Tío Gilito en ahorro. Los logros muestran las doce ilustraciones de la lámina de stickers que subiste; varios logros comparten una ilustración, pero mantienen sus nombres y condiciones propios. El álbum y los premios muestran también los objetivos pendientes con su ilustración oscurecida y el requisito para desbloquearlos; la vista inicial no concede premios ni puntos. El castillo de `public/castillo/` se ve completo y oscurecido desde el principio; sus capas ganan color con los hitos existentes de **125, 250, 375 y 500 XP acumulados**. Después permanece iluminado mientras continúan los niveles de 500 XP. Los umbrales que venían dentro del ZIP no se aplican.

La primera vez que se elige un perfil en un navegador aparece una guía de siete pasos: visión general y las seis zonas de la app. Explica cómo coger tareas, planificar comidas, registrar ahorro, ganar XP y llaves, desbloquear stickers y organizar las pools. Se puede omitir y volver a abrir desde **Cómo funciona** en el menú. La marca de guía vista se guarda por perfil en el navegador; no modifica la base de datos compartida ni concede puntos.

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

Las 34 tareas iniciales se distribuyen en cuatro pools. Las tareas de mascotas están desactivadas inicialmente y se pueden activar en **Organizar**.

| Pool | Disponibilidad tras completarla |
| --- | --- |
| Cada día | Al día siguiente |
| Cada 2–3 días | Tras 3 días completos |
| Cada semana | El lunes siguiente |
| Cada 4 semanas | Tras 28 días |

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

El plan semanal permite elegir una receta para la **comida y la cena** de cada día, navegar entre semanas y dejar huecos sin planificar. La lista **Compra** se genera automáticamente a partir de las recetas de esa semana: si una receta aparece dos veces, sus ingredientes cuentan dos veces. Los nombres iguales se agrupan sin distinguir mayúsculas ni tildes; `kg` se suma con `g`, y `l` con `ml`. Las casillas compradas se comparten entre usuarios y se conservan por semana. Si al editar el plan aumenta la cantidad de un ingrediente marcado, vuelve a quedar pendiente.

La compra ofrece búsqueda y filtros de pendientes o todos los productos. Usa dos columnas en escritorio y una en pantallas estrechas, con casillas grandes para marcar desde el móvil.

## Ahorro y objetivos

La sección **Ahorro y objetivos** muestra tres hitos compartidos: **1.000 € Viaje express**, **3.000 € Disney París** y **10.000 € Disney worldwide**. Los objetivos avanzan solo con movimientos de dinero registrados por los usuarios; también se pueden registrar retiradas. La pantalla distingue ese saldo de la estimación de pedidos evitados y muestra el historial de aportaciones.

Cada objetivo desbloquea el plan de reservas al llegar al **60 %**. Desde ese punto se pueden marcar fechas, billetes, hotel y presupuesto; la app registra el avance, sin realizar reservas por sí misma. La primera aportación positiva al ahorro de cada semana suma **10 puntos**, con independencia del importe. Las aportaciones siguientes de esa semana no duplican el bonus.

## Centro de mando y juego compartido

El inicio muestra limpieza, comidas, compra y ahorro. Cuatro hábitos diarios sirven de guía compartida sin asignar tareas. La pestaña **Hogar Co-op** añade tres misiones por semana: esfuerzo de limpieza y tareas esenciales acordadas, una misión de cocina y una de equipo. Podéis elegir para cocina entre planificar cinco comidas con la compra lista o siete días sin pedido con cinco comidas caseras. Para equipo podéis elegir entre una reunión con aporte real al ahorro o una limpieza conjunta. Cada misión conseguida da **una llave**, con un máximo de tres por semana; algunos logros extraordinarios dan otra llave una sola vez. El objetivo de XP y las tareas esenciales se pueden ajustar sin asignar responsables.

El álbum contiene logros persistentes de limpieza, cocina, ahorro y equipo. Un sticker desbloqueado puede elegirse como emblema de la app y se ve igual en ambos perfiles. También se pueden registrar gestos concretos que suelen quedar invisibles: revisar despensa, preparar raciones, aprovechar alimentos, compras con lista y una reunión de equipo. Cada tipo tiene un límite diario o semanal para evitar acumular XP repitiendo registros. La limpieza conjunta registrada como sesión reparte su XP entre ambos; si corresponde a una tarea de la pool, usad **«La hicimos juntos»** para no anotar el mismo trabajo dos veces.

Una receta se puede valorar con una a cinco estrellas después de cocinarla. El logro **Recetario en expansión** exige cocinar y valorar cinco recetas distintas; las valoraciones y la foto permanecen en la copia de seguridad.

**Carga compartida** se desbloquea cuando ambas personas confirman dos semanas que el reparto fue justo según su disponibilidad y se hizo al menos la mitad del esfuerzo acordado. No se impone una proporción entre perfiles. **Objetivo protegido** permite acordar una meta de ahorro mensual opcional; si el mes termina con ahorro neto suficiente, concede dos llaves una vez al cerrarlo. Así una retirada posterior durante el mes puede reducir el progreso antes de entregar el premio. Ninguna meta de dinero viene preasignada.

Las llaves se canjean por planes compartidos, gratuitos o con un coste declarado. Los planes con coste necesitan saldo en el **fondo de disfrute**, que se alimenta mediante traspasos desde el ahorro real registrado: reducen el objetivo de ahorro en la misma cantidad y están limitados inicialmente al 25 % de las aportaciones positivas del mes. La app registra el canje y el coste; no hace compras ni reservas. El descanso básico nunca depende de las llaves.

## Datos y copias

La base SQLite está en `data/casa.sqlite`, o en la ruta indicada por `DATABASE_PATH`. El endpoint `GET /api/export` entrega una copia JSON del plan, las pools, las tareas cogidas, los puntos, el historial, las recetas con fotos, el plan de comidas, la compra, el ahorro, las misiones, llaves, logros, fondo y canjes. El endpoint de importación acepta también copias antiguas sin datos de pools, comidas, ahorro o Hogar Co-op.

La aplicación no tiene contraseñas: cualquier persona con acceso a su dirección puede consultar o modificar los datos. Para móviles en la red local, configura `HOST=0.0.0.0` y abre la dirección de red que imprime el servidor. El equipo que aloja SQLite debe permanecer encendido. Para usar la PWA desde una IP local se necesita un origen seguro (HTTPS); el tablero compartido funciona por HTTP local.

## Despliegue

El proyecto incluye `Dockerfile`, configuración de Caddy en `deploy/` y `render.yaml`. En producción, sirve la app con `npm start`, conserva `DATABASE_PATH` en un volumen persistente y configura `PUBLIC_URL` con el origen HTTPS real. SQLite está diseñado aquí para una sola instancia del servidor.

En Render, crea o sincroniza el servicio desde `render.yaml`: usa el plan de pago `starter`, monta un disco de 1 GB en `/var/data` y guarda SQLite en `/var/data/casa.sqlite`. El control de salud `/api/health` consulta esa base. El arranque en Render rechaza una ruta de base de datos ausente, relativa o fuera de `/var/data`, para evitar que el historial y los puntos se guarden accidentalmente en el almacenamiento temporal. El disco es compartido por Iván e Irene dentro de la misma instancia; sus acciones se atribuyen al perfil elegido.

Si ya tienes datos en un servicio Render sin disco, descarga antes la copia desde `/api/export` y, después del cambio de servicio, impórtala desde la app. Render no copia automáticamente los archivos del sistema temporal al nuevo disco. En un servicio creado manualmente, configura el mismo plan, el disco y `DATABASE_PATH=/var/data/casa.sqlite` en su panel. La persistencia real del servicio publicado debe comprobarse tras el despliegue con los dos perfiles y un reinicio del servicio.

## Comprobación

```bash
npm run build
npm test
npm run test:browser
```

La prueba de navegador necesita Chromium y permiso para abrir un puerto de loopback. Las pruebas de API usan SQLite temporal y ejercitan el manejador HTTP sin abrir un puerto.
