Característica: Control de Existencias en la Terminal de Ventas (POS)
  Como vendedor de la casa de repuestos HARD
  Quiero que el sistema controle el inventario disponible al agregar productos
  Para evitar vender repuestos que no están físicamente en la estantería

  Escenario: Intento de venta superior al stock disponible en el local
    Dado que el producto "Filtro de aceite PH5548A" tiene un stock actual de 2 unidades
    Cuando el vendedor intenta ingresar una cantidad de 3 unidades al carrito en pos.html
    Entonces el sistema debe rechazar la operación
    Y debe mostrar el mensaje de advertencia "⚠️ Solo quedan 2 unidades."
    