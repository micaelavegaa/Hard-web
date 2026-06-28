// =========================================================================
// LÓGICA CORREGIDA DEL MÓDULO POS (Basado en tu pos.js real)
// =========================================================================
function agregarAlCarrito(producto, cantidadDeseada) {
    // Si el stock es infinito, pasa directo sin validar número
    if (producto.stock === "∞") {
        return { exito: true, qty: cantidadDeseada };
    }

    const stockDisponible = parseInt(producto.stock);

    // ✅ CÓDIGO CORREGIDO: Evaluamos correctamente si el stock es menor o igual a cero
    if (stockDisponible <= 0) { 
        return { exito: false, msg: `🚫 Sin stock: "${producto.nombre}"` };
    }

    // Validación 2: Si el cliente pide más de lo que hay en estantería
    if (cantidadDeseada > stockDisponible) {
        return { exito: false, msg: `⚠️ Solo quedan ${stockDisponible} unidades.` };
    }

    // Si pasa los controles, se agrega con éxito
    return { exito: true, qty: cantidadDeseada };
}

// =========================================================================
// CASOS DE PRUEBA AUTOMATIZADOS (JEST)
// =========================================================================
describe('Módulo Punto de Venta (POS) - Control de Stock Miki', () => {

    // a. PRUEBA UNITARIA (Método definido aislado)
    test('Unitaria - Debería rechazar la compra si el stock del repuesto es cero', () => {
        const productoFicticio = { nombre: 'Filtro de aceite PH5548A', stock: "0" };
        
        const resultado = agregarAlCarrito(productoFicticio, 1);
        
        expect(resultado.exito).toBe(false);
        expect(resultado.msg).toContain('🚫 Sin stock');
    });

    // b. PRUEBA DE INTEGRACIÓN (Circuito operativo completo de flujo de límites)
    test('Integración - Circuito operativo: Flujo de stock límite en compras sucesivas', () => {
        const productoEnCaja = { nombre: 'Bujía Corriente', stock: "2" };
        let miCarritoSimulado = [];
        
        // Operación 1: El cliente pide el stock total disponible (2 unidades)
        let primerIntento = agregarAlCarrito(productoEnCaja, 2);
        if (primerIntento.exito) {
            miCarritoSimulado.push({ ...productoEnCaja, qty: primerIntento.qty });
            // 🔄 SIMULACIÓN DEL CIRCUITO: Al venderse, el stock físico en estantería baja a 0
            productoEnCaja.stock = (parseInt(productoEnCaja.stock) - primerIntento.qty).toString();
        }
        
        // Operación 2: Se intenta agregar 1 unidad más en la misma sesión (ahora el stock es "0")
        let segundoIntento = agregarAlCarrito(productoEnCaja, 1);
        
        // Verificaciones del circuito integrado
        expect(miCarritoSimulado.length).toBe(1);  // Se agregó el primer ítem
        expect(miCarritoSimulado[0].qty).toBe(2);   // El carrito tiene las 2 unidades válidas
        expect(segundoIntento.exito).toBe(false);   // ✅ Ahora sí va a dar FALSE porque el stock se agotó
    });
});