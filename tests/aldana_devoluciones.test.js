// =========================================================================
// LÓGICA SIMULADA CON UN BUG ADREDE (Para forzar el fallo en rojo)
// =========================================================================
function procesarDevolucion(itemVenta, cantDevolver, stockActual) {
    // ❌ BUG INTRODUCIDO por Aldana: Cambiamos '>' por '<'
    // Ahora el sistema bloquea si la cantidad es menor, ¡pero permite devolver de más!
    if (cantDevolver > itemVenta.qty) {  
        return { error: true, msg: "La cantidad a devolver supera la compra original." };
    }
    return {
        error: false,
        nuevoStock: stockActual + cantDevolver,
        cajaImpacto: itemVenta.precio * cantDevolver
    };
}

// =========================================================================
// CASOS DE PRUEBA AUTOMATIZADOS (JEST)
// =========================================================================
describe('Módulo de Devoluciones y Garantías - Pruebas de Aldana', () => {

    // a. PRUEBA UNITARIA
    test('Unitaria - Evitar devolver más unidades de las compradas en el ticket', () => {
        const itemComprado = { nombre: 'Correa', qty: 2, precio: 3000 };
        
        const resultado = procesarDevolucion(itemComprado, 3, 10); // Intenta devolver 3 de 2
        
        expect(resultado.error).toBe(true);
    });

    // b. PRUEBA DE INTEGRACIÓN
    test('Integración - Flujo completo de devolución: impacto en stock y egreso de caja', () => {
        const itemComprado = { nombre: 'Correa', qty: 2, precio: 3000 };
        
        const resultado = procesarDevolucion(itemComprado, 1, 10); // Devuelve 1 unidad válida
        
        expect(resultado.error).toBe(false);
        expect(resultado.nuevoStock).toBe(11);   // El stock sube de 10 a 11
        expect(resultado.cajaImpacto).toBe(3000); // Salen 3000 pesos de la caja diario
    });
});