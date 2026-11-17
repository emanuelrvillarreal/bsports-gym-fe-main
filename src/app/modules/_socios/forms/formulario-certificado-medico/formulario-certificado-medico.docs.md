# FormularioCertificadoMedicoComponent

Formulario reutilizable para seleccionar o arrastrar un certificado médico y validarlo localmente antes de enviarlo.

Emite el archivo válido a través de `seleccionado`. No conoce endpoints ni identifica al socio; esa responsabilidad queda en el componente consumidor.

El área de carga acepta click o drag-and-drop, mantiene foco accesible y muestra el nombre del archivo válido seleccionado. Tras una carga exitosa, el contenedor invoca `limpiarSeleccion()` para vaciar el input y permitir volver a elegir el mismo archivo.
