export const IPM_FORMS = {
  "IPM-01": {
    title: "SERVICIO MENSUAL DE BOMBA DIÉSEL",
    code: "F-SER-014", // 
    sections: [
      {
        name: "INSPECCIÓN Y MANTENIMIENTO", // 
        items: [
          "Ejercitar válvulas normalmente abiertas del cuarto de bombas", // [cite: 18]
          "Verificar indicador de nivel del tanque de agua libre de movimiento", // [cite: 19]
          "Tanque de agua libre de materiales extraños o desechos", // [cite: 20]
          "Operar manualmente válvula de llenado automático del tanque", // [cite: 21]
          "Probar interruptor aislador del controlador jockey", // [cite: 22]
          "Activar protección térmica del controlador jockey", // [cite: 23]
          "Ejercitar interruptores suministro AC y baterías del controlador diesel", // [cite: 24]
          "Retirar corrosión de batería y limpiar carcasa", // [cite: 25]
          "Servicio de limpieza de filtros de línea de suministro de agua", // [cite: 26]
        ]
      },
      {
        name: "PRUEBAS DE ARRANQUE", // [cite: 27]
        isSpecialTable: true, // Indica que requiere la tabla de voltajes
        items: [
          "Verificar que el cargador trabaja correctamente", // [cite: 39]
          "Verificar que las baterías no sufren temperatura excesiva" // [cite: 39]
        ]
      }
    ]
  }
};