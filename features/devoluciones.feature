Característica: Gestión de Devoluciones de Repuestos y Garantías
  Como cajero de la casa de repuestos HARD
  Quiero procesar las devoluciones de productos defectuosos o incorrectos
  Para reintegrar las unidades al inventario y ajustar el saldo de la caja diaria

  Escenario: Intento de procesar una devolución que supera la cantidad comprada originalmente
    Dado que el cliente compró "2" unidades de "Correa de distribución" según el ticket
    Cuando el cajero intenta procesar una devolución por una cantidad de "3" unidades
    Entonces el sistema debe rechazar la transacción por inconsistencia de datos
    Y debe lanzar un mensaje de error indicando que la cantidad es inválida