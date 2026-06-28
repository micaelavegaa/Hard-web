// =========================================================================
// LÓGICA SIMULADA DE CUENTAS CORRIENTES (Basado en tu pos.js real)
// =========================================================================
function registrarVentaPendiente(venta) {
    // Control de validación: Si es fiado, no puede ser Consumidor Final ni estar vacío
    if (venta.metodo === "Pendiente" && (!venta.cliente || venta.cliente === "Consumidor Final" || venta.cliente.trim() === "")) {
        return { registrado: false, error: "Requiere un nombre de cliente o patente para la cuenta corriente." };
    }
    return { registrado: true, estado: venta.metodo, cliente: venta.cliente };
}

function liquidarCuentaCorriente(venta) {
    if (venta.metodo === "Pendiente") {
        venta.metodo = "Efectivo"; // Pasa a estar cobrada en caja
        return { liquidada: true, nuevoEstado: venta.metodo };
    }
    return { liquidada: false };
}

// =========================================================================
// CASOS DE PRUEBA AUTOMATIZADOS (JEST)
// =========================================================================

describe('Módulo de Cuentas Pendientes y Fiados - Pruebas de Gisela', () => {

    // a. PRUEBA UNITARIA (Método definido aislado)
    test('Unitaria - Debería rechazar el registro de un fiado si el cliente es Consumidor Final o está vacío', () => {
        const ventaInvalida = { total: 8500, metodo: "Pendiente", cliente: "Consumidor Final" };
        
        const resultado = registrarVentaPendiente(ventaInvalida);
        
        expect(resultado.registrado).toBe(false);
        expect(resultado.error).toContain('Requiere un nombre de cliente');
    });

    // b. PRUEBA DE INTEGRACIÓN (Circuito operativo completo de flujo de cuentas)
    test('Integración - Circuito operativo: Registrar venta al fiado a un cliente y luego confirmar su cobro en efectivo', () => {
        // Escenario Paso 1: Llega un cliente conocido y se le genera una cuenta corriente
        const nuevaVentaFiada = { total: 25000, metodo: "Pendiente", cliente: "Taller Mecánico Misiones" };
        
        const flujoRegistro = registrarVentaPendiente(nuevaVentaFiada);
        expect(flujoRegistro.registrado).toBe(true);
        expect(flujoRegistro.cliente).toBe("Taller Mecánico Misiones");

        // Escenario Paso 2: El cliente regresa días después a saldar su deuda en el POS
        const flujoCobro = liquidarCuentaCorriente(nuevaVentaFiada);
        
        // Verificaciones del circuito integrado completo:
        expect(flujoCobro.liquidada).toBe(true);
        expect(flujoCobro.nuevoEstado).toBe("Efectivo"); // Se integró correctamente el cambio de estado a cobrado
    });
});