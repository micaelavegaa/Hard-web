// =========================================================================
// LÓGICA SIMULADA DE ADMINISTRACIÓN (Basado en tu admin.js real)
// =========================================================================
function modificarPrecioMasivo(productos, porcentaje, accion) {
    // Control de límite: Si el porcentaje es inválido, menor o igual a 0, la operación se cancela
    if (porcentaje <= 0 || isNaN(porcentaje)) {
        return null; 
    }

    // Recorre y actualiza el arreglo de productos en memoria
    return productos.map(p => {
        let cambio = p.precio * (porcentaje / 100);
        
        if (accion === 'subir') {
            p.precio = parseFloat((p.precio + cambio).toFixed(2));
        } else if (accion === 'bajar') {
            p.precio = parseFloat((p.precio - cambio).toFixed(2));
        }
        
        return p;
    });
}

// =========================================================================
// CASOS DE PRUEBA AUTOMATIZADOS (JEST)
// =========================================================================

describe('Módulo de Administración - Precios Masivos de Lisandro', () => {

    // a. PRUEBA UNITARIA (Método definido aislado)
    test('Unitaria - Debería rechazar la operación y retornar null si el porcentaje es menor o igual a cero', () => {
        const productosPrueba = [{ nombre: 'Pastillas', precio: 10000 }];
        
        // Intenta ejecutar un ajuste masivo con -5% (Inválido)
        const resultado = modificarPrecioMasivo(productosPrueba, -5, 'subir');
        
        expect(resultado).toBeNull();
    });

    // b. PRUEBA DE INTEGRACIÓN (Circuito operativo completo de actualización)
    test('Integración - Circuito operativo: Modificar el precio masivamente al alza para el listado de productos', () => {
        // Escenario: Tenemos un inventario inicial en la base de datos
        const inventarioOriginal = [
            { nombre: 'Pastillas de freno', precio: 10000 },
            { nombre: 'Filtro de aire', precio: 4000 }
        ];
        
        // Se ejecuta el circuito operativo completo de aumentar un 15% masivo
        const inventarioActualizado = modificarPrecioMasivo(inventarioOriginal, 15, 'subir');
        
        // Verificaciones del circuito integrado:
        // Pastillas: 10000 + 15% = 11500
        // Filtro: 4000 + 15% = 4600
        expect(inventarioActualizado).not.toBeNull();
        expect(inventarioActualizado[0].precio).toBe(11500);
        expect(inventarioActualizado[1].precio).toBe(4600);
    });
});