# Planificador de Horarios

Página web personal para armar el horario del semestre: registra tus materias
con sus posibles opciones de clase y genera automáticamente todas las
combinaciones de horario que no tengan choques.

## Cómo usarla

1. Abre `index.html` en tu navegador (doble clic, no necesita servidor).
2. **Pestaña "01 · Materias"**
   - Añade una materia con su nombre y, si quieres, un código.
   - En cada materia, pulsa **"+ Añadir opción"** para registrar una forma
     posible de cursarla:
     - Profesor (opcional).
     - Una o varias "clases": cada clase tiene sus días (lunes a viernes),
       hora de inicio (selector en formato 12h am/pm, solo en punto o y
       media) y duración en minutos (múltiplos de 30). Útil cuando,
       por ejemplo, la materia se ve lunes/miércoles a una hora y viernes a
       otra distinta.
   - Puedes editar o eliminar materias y opciones cuando quieras.
3. **Pestaña "02 · Horarios posibles"**
   - Marca las materias que quieres incluir (solo aparecen seleccionables
     las que ya tienen al menos una opción).
   - Filtros opcionales:
     - **No empezar antes de**: descarta horarios con clases antes de esa hora.
     - **Salir / terminar antes de**: descarta horarios con clases que
       terminen después de esa hora (por ejemplo, salir antes de las 7pm).
     - **Profesores preferidos**: los horarios que incluyan a esos
       profesores se muestran primero (no es un filtro estricto).
     - **Profesores a evitar**: descarta cualquier horario que incluya a
       esos profesores.
   - Pulsa **"Generar horarios"** y navega entre las combinaciones con
     "Anterior" / "Siguiente". Cada celda muestra el nombre, código (si
     existe) y profesor (si existe) de la materia, con un color propio y
     texto siempre legible.

## Guardado de datos

- Tus materias se guardan automáticamente en el navegador (localStorage), no
  se pierden al cerrar la pestaña.
- Usa **"Exportar JSON"** para descargar un archivo `materias.json` con todas
  tus materias (sirve como respaldo o para llevarlas a otro computador).
- Usa **"Importar JSON"** para cargar un archivo exportado previamente.

## Estructura del proyecto

```
horario-universitario/
├── index.html   # estructura de la página
├── style.css    # estilos
├── script.js    # lógica de la aplicación
└── README.md
```

No requiere instalación, dependencias ni conexión a internet (salvo para
cargar las tipografías de Google Fonts; si no hay internet, se usa una
tipografía de respaldo del sistema).