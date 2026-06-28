Característica: Control de Créditos y Cuentas Corrientes (Fiados)
  Como cajero de la casa de repuestos HARD
  Quiero registrar ventas con condición de pago pendiente asociadas a un cliente válido
  Para llevar un control estricto de las deudas y evitar pérdidas financieras

  Escenario: Intento de registrar una venta al fiado bloqueada por falta de identificador
    Dado que el cajero selecciona la Condición de Pago como "Pendiente" en pos.html
    Cuando el campo Cliente / Patente se deja vacío o se mantiene como "Consumidor Final"
    Entonces el sistema debe impedir procesar la venta
    Y debe exigir un identificador de cliente válido para registrar la deuda