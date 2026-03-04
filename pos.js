import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, orderBy, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDIMMPlxITTKniHB-XCjt0OMHnV_j9MIJs",
    authDomain: "hard-web-3bab8.firebaseapp.com",
    projectId: "hard-web-3bab8",
    storageBucket: "hard-web-3bab8.firebasestorage.app",
    messagingSenderId: "165904646260",
    appId: "1:165904646260:web:88788e2b51ad3ad4af1121"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let posCart = [];
let totalVenta = 0;
let fiadoActual = null; // Para gestión de cobros

// --- SEGURIDAD DEL PANEL CON MEMORIA Y VALIDACIÓN ---
function verificarSeguridad() {
    const logueado = sessionStorage.getItem('pos_autenticado');
    const overlay = document.getElementById('pos-login-overlay');

    if (logueado === 'true') {
        if (overlay) overlay.style.display = 'none';
        const input = document.getElementById('pos-barcode-input');
        if (input) input.focus();
    }
}

// IMPORTANTE: Llamamos a la función apenas carga el archivo
verificarSeguridad();

document.getElementById('btn-pos-login').onclick = function() {
    const passInput = document.getElementById('pos-password-input').value;
    const errorMsg = document.getElementById('pos-login-error');
    
    if (passInput.trim() === "") {
        errorMsg.innerText = "⚠️ El campo es obligatorio";
        errorMsg.style.display = 'block';
    } else if (passInput === "alanmiguel2020") { 
        sessionStorage.setItem('pos_autenticado', 'true');
        document.getElementById('pos-login-overlay').style.display = 'none';
        const input = document.getElementById('pos-barcode-input');
        if (input) input.focus();
    } else {
        errorMsg.innerText = "❌ Contraseña incorrecta";
        errorMsg.style.display = 'block';
        document.getElementById('pos-password-input').value = '';
    }
};

// Permitir entrar dándole al "Enter"
document.getElementById('pos-password-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-pos-login').click();
});

// --- NAVEGACIÓN ---
window.showSection = (sectionId) => {
    document.querySelectorAll('.pos-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-btn-large').forEach(b => b.classList.remove('active'));
    
    document.getElementById(`section-${sectionId}`).style.display = 'block';
    const btn = document.getElementById(`btn-nav-${sectionId}`);
    if (btn) btn.classList.add('active');
    
    if(sectionId === 'pendientes') loadPendientes();
    if(sectionId === 'historial') loadHistorial();
    if(sectionId === 'movimientos') loadGastos(); // <-- Nueva llamada
};

// --- BUSCADOR EN VIVO (POS) ---
//si es 0 entonces producto sin stock.
const barcodeInput = document.getElementById('pos-barcode-input');
const suggestionsList = document.getElementById('pos-suggestions');

if (barcodeInput) {
    barcodeInput.addEventListener('input', async (e) => {
        const term = e.target.value.trim().toLowerCase();
        if (term.length < 2) { suggestionsList.style.display = 'none'; return; }

        const q = query(collection(db, "productos"));
        const snap = await getDocs(q);
        let matches = [];
        snap.forEach(docSnap => {
            const p = docSnap.data();
            if (p.nombre.toLowerCase().includes(term) || (p.barcode && p.barcode.includes(term))) {
                matches.push({ id: docSnap.id, ...p });
            }
        });

        suggestionsList.innerHTML = '';
        matches.slice(0, 5).forEach(p => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `<span class="prod-name">${p.nombre}</span><span class="prod-price">$${p.precio}</span>`;
            div.onclick = () => { 
                agregarAlCarrito(p); 
                suggestionsList.style.display = 'none'; 
                barcodeInput.value = ''; 
                barcodeInput.focus(); 
            };
            suggestionsList.appendChild(div);
        });
        suggestionsList.style.display = matches.length ? 'block' : 'none';
    });
}

// --- CARRITO Y RENDER ---
async function agregarAlCarrito(p) {
    const existe = posCart.find(item => item.id === p.id);
    const cantidadDeseada = existe ? existe.qty + 1 : 1;

    // Si el stock no es infinito, validamos
    if (p.stock !== "∞") {
        const stockDisponible = parseInt(p.stock);
        
        if (stockDisponible <= 0) {
            alert(`🚫 ¡ERROR! "${p.nombre}" no tiene stock disponible.`);
            return;
        }
        
        if (cantidadDeseada > stockDisponible) {
            alert(`⚠️ Solo quedan ${stockDisponible} unidades de "${p.nombre}"`);
            return;
        }

        if (stockDisponible < 5) {
            console.log(`📢 Aviso: Quedan pocas unidades (${stockDisponible})`);
        }
    }

    if (existe) { 
        existe.qty++; 
    } else { 
        posCart.push({ id: p.id, nombre: p.nombre, precio: parseFloat(p.precio), qty: 1, stockOriginal: p.stock }); 
    }
    renderCart();
}

function renderCart() {
    const body = document.getElementById('pos-cart-body');
    const discountInput = document.getElementById('pos-discount');
    const discountPercent = parseFloat(discountInput.value) || 0;
    body.innerHTML = '';
    let subtotal = 0;

    posCart.forEach((item, index) => {
        const sub = item.precio * item.qty;
        subtotal += sub;
        body.innerHTML += `
            <tr>
                <td>${item.nombre}</td>
                <td>$${item.precio.toLocaleString()}</td>
                <td><input type="number" value="${item.qty}" min="1" onchange="updateQty(${index}, this.value)" style="width:60px; background:#333; color:white; border:none; padding:8px; border-radius:4px; text-align:center;"></td>
                <td class="subtotal-col">$${sub.toLocaleString()}</td>
                <td onclick="removeItem(${index})" style="cursor:pointer; text-align:center;">❌</td>
            </tr>`;
    });

    const montoDescuento = (subtotal * discountPercent) / 100;
    totalVenta = subtotal - montoDescuento;

    document.getElementById('pos-subtotal').innerText = `$ ${subtotal.toLocaleString()}`;
    document.getElementById('pos-total-price').innerText = `$ ${totalVenta.toLocaleString()}`;
}

window.updateQty = async (index, val) => {
    const item = posCart[index];
    const nuevaCant = parseInt(val) || 1;

    // Buscamos el stock real en la base de datos para estar seguros
    try {
        const prodRef = doc(db, "productos", item.id);
        const pDoc = await getDoc(prodRef);

        if (pDoc.exists()) {
            const stockReal = pDoc.data().stock;

            // Si no es infinito, validamos
            if (stockReal !== "∞") {
                const disponible = parseInt(stockReal);
                
                if (nuevaCant > disponible) {
                    alert(`🚫 No se puede. Solo hay ${disponible} unidades disponibles de "${item.nombre}"`);
                    // Volvemos el input al valor anterior o al máximo disponible
                    renderCart(); 
                    return;
                }
            }
        }
        
        // Si pasa la validación, actualizamos el carrito
        posCart[index].qty = nuevaCant;
        renderCart();

    } catch (e) {
        console.error("Error al validar stock:", e);
    }
};

window.removeItem = (index) => { posCart.splice(index, 1); renderCart(); };
document.getElementById('pos-discount').addEventListener('input', renderCart);

// --- FINALIZAR VENTA ---
document.getElementById('btn-finish-sale').onclick = async () => {
    if (!posCart.length) return alert("Carrito vacío");

    const btn = document.getElementById('btn-finish-sale');
    const discountPercent = parseFloat(document.getElementById('pos-discount').value) || 0;
    
    btn.innerText = "Procesando...";
    btn.disabled = true;

    const subtotalVenta = posCart.reduce((acc, item) => acc + (item.precio * item.qty), 0);
    const montoDescuento = (subtotalVenta * discountPercent) / 100;

    const ventaData = {
        ticketId: "HARD-" + Date.now().toString().slice(-6), //a esto me refiero si el ticket ya esta generado porque se cobro anteriormente entonces la hora esta en la columna y la fecha en la sección de ahí por ejemplo en pendiiente ahi si, cobre recien asi que la plata ingresa a ese momento y si esta bien que se cobre y se actualice el ticjet pero antes de eso cuando veo el pediente quiero saber la verdadera fecha se supone
        cliente: document.getElementById('pos-customer-name').value || "Consumidor Final",
        items: posCart,
        subtotal: subtotalVenta,
        descuentoAplicado: montoDescuento,
        total: totalVenta,
        metodo: document.getElementById('pos-sale-status').value,
        fecha: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "ventas"), ventaData);

        for (const item of posCart) {
            const prodRef = doc(db, "productos", item.id);
            const pDoc = await getDoc(prodRef);
            if (pDoc.exists() && pDoc.data().stock !== "∞") {
                const stockActual = parseInt(pDoc.data().stock) || 0;
                await updateDoc(prodRef, { stock: (stockActual - item.qty).toString() });
            }
        }

        window.mostrarTicket(ventaData);
        posCart = []; 
        document.getElementById('pos-customer-name').value = '';
        document.getElementById('pos-discount').value = 0;
        renderCart();

    } catch (e) { alert("Error: " + e.message); }
    finally { btn.innerText = "PROCESAR (F2)"; btn.disabled = false; }
};
// Permitir carga directa con Escáner / Enter
document.getElementById('pos-barcode-input').addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const barcode = e.target.value.trim();
        if (!barcode) return;

        // Buscamos directamente en Firebase por el campo 'barcode'
        const q = query(collection(db, "productos"), where("barcode", "==", barcode));
        const snap = await getDocs(q);

        if (!snap.empty) {
            // Si lo encuentra, tomamos el primero (debería ser único)
            const docSnap = snap.docs[0];
            const producto = { id: docSnap.id, ...docSnap.data() };
            
            // Lo agregamos al carrito directamente
            agregarAlCarrito(producto);
            
            // Limpiamos y preparamos para el siguiente escaneo
            e.target.value = '';
            suggestionsList.style.display = 'none';
            e.target.focus();
        } else {
            // Si no es un código de barras exacto, tal vez es una búsqueda por nombre
            // En ese caso, si hay sugerencias abiertas, elegimos la primera
            const primeraSugerencia = suggestionsList.querySelector('.suggestion-item');
            if (primeraSugerencia) {
                primeraSugerencia.click();
            } else {
                alert("Producto no encontrado");
                e.target.select();
            }
        }
    }
});
// --- GESTIÓN DE TICKET ---
window.mostrarTicket = (v) => {
    const nombreCliente = v.cliente || "Consumidor Final";
    const desc = v.descuentoAplicado || 0;
    const sub = v.subtotal || v.total + desc;
    
    // --- CORRECCIÓN DE FECHA ---
    let fechaLegible = "---";
    
    if (v.fecha) {
        // Si viene de Firebase (objeto Timestamp)
        if (typeof v.fecha.toDate === 'function') {
            const f = v.fecha.toDate();
            fechaLegible = f.toLocaleDateString() + ' ' + f.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } 
        // Si ya es un objeto Date de JS
        else if (v.fecha instanceof Date) {
            fechaLegible = v.fecha.toLocaleDateString() + ' ' + v.fecha.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
        // Si es un string o fallback (para ventas recién hechas que aún no subieron)
        else {
            const ahora = new Date();
            fechaLegible = ahora.toLocaleDateString() + ' ' + ahora.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
    } else {
        // Caso de emergencia si no hay fecha
        const ahora = new Date();
        fechaLegible = ahora.toLocaleDateString() + ' ' + ahora.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    const html = `
        <div style="display: flex; flex-direction: column; min-height: 480px; color: black; font-family: 'Courier New', monospace; padding: 5px;">
            <div style="text-align: center;">
                <h2 style="margin:0;">HARD</h2>
                <p style="font-size:10px; margin:0;">REPUESTOS Y LUBRICANTES</p>
                <p style="font-size:10px; margin:0;">Av. cocomarola 8315</p>
                <p style="font-size:11px; margin-top: 5px;">${fechaLegible}</p> 
                <p style="font-size:11px; margin-top: 2px;">Ticket: ${v.ticketId}</p>
                <p style="font-size:11px; text-align: left; margin: 10px 0 0 0;">Cliente: ${nombreCliente}</p>
                <hr style="border: none; border-top: 1px dashed #000; margin-top: 8px;">
            </div>
            
            <div style="flex-grow: 1; text-align: left; margin: 15px 0;">
                ${v.items.map(i => `
                    <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
                        <span>${i.qty} x ${i.nombre}</span>
                        <span>$${(i.qty * i.precio).toLocaleString()}</span>
                    </div>`).join('')}
            </div>

            <div style="margin-top: auto; border-top: 1px dashed #000; padding-top: 10px;">
                <div style="display:flex; justify-content:space-between; font-size:12px;">
                    <span>Subtotal:</span>
                    <span>$${sub.toLocaleString()}</span>
                </div>
                ${desc > 0 ? `<div style="display:flex; justify-content:space-between; font-size:12px; color:red;"><span>Descuento:</span><span>-$${desc.toLocaleString()}</span></div>` : ''}
                <h3 style="text-align:right; margin: 5px 0 0 0; font-size: 1.4rem;">TOTAL: $${v.total.toLocaleString()}</h3>
                <p style="text-align:right; font-size:10px; margin: 2px 0 0 0;">Método: ${v.metodo}</p>
                <p style="text-align:center; font-size:9px; margin-top: 15px;">¡Gracias por confiar en HARD!</p>
            </div>
        </div>`;
    
    document.getElementById('ticket-visual').innerHTML = html;
    document.getElementById('ticket-print-area').innerHTML = html;
    document.getElementById('modal-ticket').style.display = 'flex';
}

// --- HISTORIAL AGRUPADO POR FECHA ---
// --- HISTORIAL Y RESUMEN DE CAJA NETO ---
async function loadHistorial() {
    const list = document.getElementById('section-historial');
    const snapVentas = await getDocs(query(collection(db, "ventas"), orderBy("fecha", "desc")));
    
    // Traemos los gastos para procesar el balance del día
    const snapGastos = await getDocs(collection(db, "gastos"));
    
    let cajasHoy = { Efectivo: 0, Transferencia: 0, Tarjeta: 0, Total: 0 };
    let totalGastosHoy = 0;
    let hoyStr = new Date().toLocaleDateString();

    // 1. Calculamos los gastos de hoy para el resumen
    snapGastos.forEach(dg => {
        const g = dg.data();
        if (g.fecha && g.fecha.toDate().toLocaleDateString() === hoyStr) {
            totalGastosHoy += g.monto;
            // Restamos preventivamente según el método para el balance individual
            if (cajasHoy[g.metodo] !== undefined) cajasHoy[g.metodo] -= g.monto;
        }
    });

    let htmlTickets = "";
    let ultimaFechaCargada = "";

    // 2. Procesamos ventas y generamos las tablas por día
    snapVentas.forEach(d => {
        const v = d.data();
        if (!v.fecha) return;
        const fechaTicket = v.fecha.toDate();
        const fechaStr = fechaTicket.toLocaleDateString();
        const horaStr = fechaTicket.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        // Sumamos ventas al total de caja de hoy
        if (fechaStr === hoyStr && v.metodo !== "Pendiente") {
            if (cajasHoy[v.metodo] !== undefined) cajasHoy[v.metodo] += v.total;
            cajasHoy.Total += v.total;
        }

        // Estructura de tablas (Mismo estilo que ventas)
        if (fechaStr !== ultimaFechaCargada) {
            if (ultimaFechaCargada !== "") htmlTickets += `</tbody></table></div></div>`;
            htmlTickets += `
                <div class="historial-dia-group">
                    <div class="fecha-separador">${fechaStr === hoyStr ? "HOY - " + fechaStr : fechaStr}</div>
                    <div class="table-container-v2">
                        <table class="pos-table-v2">
                            <thead><tr><th>Hora</th><th>Ticket / Cliente</th><th>Método</th><th>Total</th><th>Acción</th></tr></thead>
                            <tbody>`;
            ultimaFechaCargada = fechaStr;
        }

        htmlTickets += `
            <tr class="historial-row">
                <td style="color:var(--text-muted); font-size:0.85rem;">${horaStr}</td>
                <td><strong>${v.ticketId}</strong><br><small style="color:#aaa;">${v.cliente || 'Consumidor Final'}</small></td>
                <td>${v.metodo}</td>
                <td style="font-weight:700;">$${v.total.toLocaleString()}</td>
                <td><button onclick='reimprimirTicket(${JSON.stringify(v)})' class="btn-ver-ticket">📄 Ver</button></td>
            </tr>`;
    });

    // 3. Balance final restando gastos del total general
    cajasHoy.Total -= totalGastosHoy;

    // 4. Renderizamos el Resumen manteniendo tu GRID de 4 columnas (sin apilar)
    const resumenHTML = `
        <div class="scanner-box-v2" style="margin-bottom:20px;">
            <div class="section-header-v2"><span class="icon">📊</span><h2>Resumen de Caja</h2></div>
            <div class="caja-resumen-grid" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:15px; margin-bottom:30px;">
                <div class="card-resumen">💵 Efectivo<br><span>$${cajasHoy.Efectivo.toLocaleString()}</span></div>
                <div class="card-resumen">📱 Transf.<br><span>$${cajasHoy.Transferencia.toLocaleString()}</span></div>
                <div class="card-resumen">💳 Tarjeta<br><span>$${cajasHoy.Tarjeta.toLocaleString()}</span></div>
                <div class="card-resumen" style="border-bottom: 3px solid var(--hard-red);">Total<br><span style="color:var(--hard-red); font-size:1.5rem;">$${cajasHoy.Total.toLocaleString()}</span></div>
                <div class="card-resumen" style="color: #ff4444;">Gastos Varios<br><span>-$${totalGastosHoy.toLocaleString()}</span></div>
            </div>
        </div>`;

    list.innerHTML = resumenHTML + htmlTickets + `</tbody></table></div></div>`;
}


window.reimprimirTicket = (v) => { window.mostrarTicket(v); };

window.filterHistorial = () => {
    const searchTerm = document.getElementById('historial-search').value.toLowerCase();
    const rows = document.querySelectorAll('.historial-row');
    rows.forEach(row => {
        row.style.display = row.innerText.toLowerCase().includes(searchTerm) ? '' : 'none';
    });
};

// --- PENDIENTES ---
async function loadPendientes() {
    const list = document.getElementById('section-pendientes');
    try {
        const q = query(collection(db, "ventas"), where("metodo", "==", "Pendiente"));
        const snap = await getDocs(q);
        
        let buscadorHTML = `
            <div style="margin-bottom:20px; background: var(--bg-dark-panel); padding: 10px; border-radius: 8px; border: 1px solid var(--border-color);">
                <input type="text" id="pendientes-search" placeholder="🔍 Buscar fiado por nombre o ticket..." 
                style="width: 100%; background: transparent; border: none; color: white; outline: none;" 
                oninput="window.filterPendientes()">
            </div>`;

        if (snap.empty) {
            list.innerHTML = buscadorHTML + `<div class="scanner-box-v2"><h2>Resumen de Pendientes</h2><p>No hay cuentas pendientes.</p></div>`;
            return;
        }

        let html = buscadorHTML + `<div class="section-header-v2"><span class="icon">⏳</span><h2>Cuentas Pendientes</h2></div><div class="pendientes-grid">`;
        
        snap.forEach(d => {
            const v = d.data();
            html += `
                <div class="fiado-card" data-search="${v.cliente.toLowerCase()} ${v.ticketId.toLowerCase()}">
                    <div class="fiado-header"><span class="fiado-ticket">${v.ticketId}</span></div>
                    <div class="fiado-body">
                        <h4 class="fiado-cliente">${v.cliente}</h4>
                        <div class="fiado-monto">$ ${v.total.toLocaleString()}</div>
                    </div>
                    <div class="fiado-footer">
                        <button onclick='reimprimirTicket(${JSON.stringify(v).replace(/'/g, "&apos;")})' class="btn-view-fiado">Ver</button>
                        <button onclick="window.cobrarFiado('${d.id}', '${v.cliente}', ${v.total})" class="btn-cobrar-v2">Cobrar</button>
                    </div>
                </div>`;
        });
        list.innerHTML = html + `</div>`;
    } catch (e) { list.innerHTML = `<p>Error: ${e.message}</p>`; }
}

// Función para filtrar fiados
window.filterPendientes = () => {
    const term = document.getElementById('pendientes-search').value.toLowerCase();
    const cards = document.querySelectorAll('.fiado-card');
    cards.forEach(card => {
        card.style.display = card.getAttribute('data-search').includes(term) ? 'block' : 'none';
    });
};

window.cobrarFiado = (docId, cliente, total) => {
    fiadoActual = { id: docId, cliente: cliente, total: total };
    const titulo = document.getElementById('cobrar-titulo');
    if (titulo) titulo.innerText = `Cobrar $${total.toLocaleString()} a ${cliente}`;
    document.getElementById('modal-cobrar-fiado').style.display = 'flex';
};

window.confirmarCobro = async (metodoSeleccionado) => {
    if(!fiadoActual) return;
    
    // Guardamos el nombre en una variable temporal antes de limpiar fiadoActual
    const nombreParaMensaje = fiadoActual.cliente;
    
    try {
        await updateDoc(doc(db, "ventas", fiadoActual.id), { 
            metodo: metodoSeleccionado,
            fecha_cobro: serverTimestamp()
        });
        
        // Primero avisamos al usuario
        alert(`¡Venta de ${nombreParaMensaje} saldada con ${metodoSeleccionado}!`);
        
        // Después cerramos y limpiamos todo
        window.cerrarModalCobro();
        loadPendientes(); 
        
    } catch (e) {
        alert("Error al cobrar: " + e.message);
    }
};

window.cerrarModalCobro = () => {
    const modal = document.getElementById('modal-cobrar-fiado');
    if (modal) modal.style.display = 'none';
    fiadoActual = null; // Ahora sí lo borramos tranquilos
};

window.ejecutarImpresion = () => {
    document.getElementById('modal-ticket').style.display = 'none';
    setTimeout(() => { window.print(); barcodeInput.focus(); }, 250);
};

window.cerrarTicket = () => { document.getElementById('modal-ticket').style.display = 'none'; };

document.addEventListener('keydown', (e) => { if(e.key === 'F2') document.getElementById('btn-finish-sale').click(); });
function iniciarReloj() {
    const clockDate = document.getElementById('pos-clock-date');
    const clockTime = document.getElementById('pos-clock-time');

    setInterval(() => {
        const ahora = new Date();
        
        // Fecha: "Lunes, 02 de Marzo"
        const opcionesFecha = { weekday: 'long', day: '2-digit', month: 'long' };
        clockDate.innerText = ahora.toLocaleDateString('es-AR', opcionesFecha);
        
        // Hora: "15:45:02"
        clockTime.innerText = ahora.toLocaleTimeString('es-AR', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
    }, 1000);
}

// Función para registrar el gasto
window.registrarGasto = async () => {
    const motivo = document.getElementById('gasto-motivo').value;
    const monto = parseFloat(document.getElementById('gasto-monto').value);
    const metodo = document.getElementById('gasto-metodo').value;

    if (!motivo || isNaN(monto)) return alert("Por favor, completa motivo y monto.");

    try {
        await addDoc(collection(db, "gastos"), {
            motivo: motivo,
            monto: monto,
            metodo: metodo,
            fecha: serverTimestamp()
        });
        
        document.getElementById('gasto-motivo').value = '';
        document.getElementById('gasto-monto').value = '';
        loadGastos(); // Recargar la tabla de abajo
        alert("Gasto registrado!");
    } catch (e) {
        alert("Error al registrar: " + e.message);
    }
};

// --- CARGA DE GASTOS 
async function loadGastos() {
    const tabla = document.getElementById('gastos-body');
    const snap = await getDocs(query(collection(db, "gastos"), orderBy("fecha", "desc")));
    let html = ""; 
    let ultimaFecha = ""; 
    let hoyStr = new Date().toLocaleDateString();

    snap.forEach(docSnap => {
        const g = docSnap.data();
        if(!g.fecha) return;
        const fechaStr = g.fecha.toDate().toLocaleDateString();

        // Usamos la misma clase 'fecha-separador' que usas en ventas
        if (fechaStr !== ultimaFecha) {
            html += `
                <tr>
                    <td colspan="5" style="padding:0;">
                        <div class="fecha-separador" style="margin-top:15px; margin-bottom:0;">
                            ${fechaStr === hoyStr ? "HOY - " + fechaStr : fechaStr}
                        </div>
                    </td>
                </tr>`;
            ultimaFecha = fechaStr;
        }

        html += `
            <tr class="gasto-row">
                <td style="color:#aaa; font-size:0.85rem;">${g.fecha.toDate().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td>
                <td style="text-transform:uppercase;"><strong>${g.motivo}</strong></td>
                <td>${g.metodo}</td>
                <td style="color:#ff4444; font-weight:bold;">-$${g.monto.toLocaleString()}</td>
                <td><button onclick="eliminarGasto('${docSnap.id}')" style="background:none; border:none; cursor:pointer;">🗑️</button></td>
            </tr>`;
    });
    tabla.innerHTML = html;
}

// Llamala al final de tu archivo o después de verificar seguridad
iniciarReloj();