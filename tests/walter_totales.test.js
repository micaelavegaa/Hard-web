// =========================================================================
// LÓGICA SIMULADA DE FACTURACIÓN (Basado en tu pos.js real)
// =========================================================================
function calcularTotalVenta(items, descuentoPorcentaje) {
    // Calcula el subtotal sumando el precio * cantidad de cada repuesto
    let subtotal = items.reduce((acc, item) => acc + (item.precio * item.qty), 0);
    
    // Aplica el descuento directo en base al porcentaje
    let descuentoAplicado = (subtotal * descuentoPorcentaje) / 100;
    
    // Retorna el monto final neto
    return subtotal - descuentoAplicado;
}

// =========================================================================
// CASOS DE PRUEBA AUTOMATIZADOS (JEST)
// =========================================================================

describe('Módulo de Facturación y Totales - Pruebas de Walter', () => {

    // a. PRUEBA UNITARIA (Método definido aislado)
    test('Unitaria - Debería calcular correctamente el subtotal bruto de los ítems', () => {
        const itemsEnTabla = [
            { nombre: 'Filtro de Aceite', precio: 5000, qty: 2 }
        ];
        
        // Ejecuta la función con 0% de descuento para evaluar solo el subtotal
        const resultadoSubtotal = calcularTotalVenta(itemsEnTabla, 0);
        
        expect(resultadoSubtotal).toBe(10000); // 5000 * 2 = 10000
    });

    // b. PRUEBA DE INTEGRACIÓN (Circuito operativo completo de facturación)
    test('Integración - Circuito operativo: Sumar múltiples repuestos y aplicar descuento de caja', () => {
        // Escenario: El cliente compra un juego de pastillas y dos bujías
        const carritoDelCliente = [
            { nombre: 'Pastillas de freno', precio: 12000, qty: 1 },
            { nombre: 'Bujía Corriente', precio: 1500, qty: 2 }
        ]; // Subtotal: 12000 + 3000 = 15000 pesos
        
        // El cajero aplica un 10% de descuento directo en el POS
        const totalFinalNeto = calcularTotalVenta(carritoDelCliente, 10);
        
        // Verificaciones del circuito integrado:
        // 10% de 15000 es 1500. Total esperado: 15000 - 1500 = 13500
        expect(totalFinalNeto).toBe(13500);
    });
});