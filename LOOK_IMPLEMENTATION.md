# Interfaz de `new lookk.zip`

La app usa los fondos limpios `00_background.png` del nuevo kit, guardados en `public/new-look/`. Las escenas repetidas comparten el mismo archivo. Los textos, cifras y controles siguen viniendo de React y la API.

| Vista | Fondo del kit |
| --- | --- |
| Entrada e Inicio | S01: callejón y fuente; castillo con las cuatro capas existentes según XP real |
| Guía y álbum | S02; S15 comparte este fondo |
| Tareas | S04 |
| Plan, recetas y editor | S05; S06 y S08 comparten este fondo |
| Compra | S07 |
| Resumen, ingresos y gastos | S09; S10 y S11 comparten este fondo |
| Ahorro y viajes | S12 |
| Misiones y premios | S13 y S14 |
| Organización | S16 |

S03 se conserva como recurso para futuras vistas del proyecto. Inicio usa S01 porque su fuente y callejón simétrico permiten centrar el castillo grande. El mapa de estancias filtra las tareas reales por zona y frecuencia. Misiones y Premios tienen vistas independientes.

No se añadieron tablas: el rediseño usa el estado ya persistido en SQLite para tareas, recetas, comidas, compra, ingresos, gastos, ahorro, misiones, llaves y logros. Los fondos no crean datos de muestra. Todas las escrituras siguen pasando por la API existente.

Revisión: `npm run build`, `npm test` y `scripts/visual-audit.mjs`. La auditoría abre y captura las 16 vistas en 390 y 1440 px, comprueba el filtro del mapa y detecta desbordamiento horizontal. Los fondos nuevos se guardan en la caché sin conexión al visitar cada vista.
