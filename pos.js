import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, orderBy, getDoc, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
let fiadoActual = null;
let ventasParaDevolucion = []; 

// --- 1. SEGURIDAD ---
function verificarSeguridad() {
    const logueado = sessionStorage.getItem('pos_autenticado');
    const overlay = document.getElementById('pos-login-overlay');
    if (logueado === 'true') {
        if (overlay) overlay.style.display = 'none';
        const input = document.getElementById('pos-barcode-input');
        if (input) input.focus();
    }
}
verificarSeguridad();

document.getElementById('btn-pos-login').onclick = function() {
    const passInput = document.getElementById('pos-password-input').value;
    if (passInput === "alanmiguel2020") { 
        sessionStorage.setItem('pos_autenticado', 'true');
        document.getElementById('pos-login-overlay').style.display = 'none';
        document.getElementById('pos-barcode-input').focus();
    } else {
        document.getElementById('pos-login-error').style.display = 'block';
    }
};

document.getElementById('pos-password-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-pos-login').click();
});

// --- 2. NAVEGACIÓN ---
window.showSection = (sectionId) => {
    document.querySelectorAll('.pos-section').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.nav-btn-large').forEach(b => b.classList.remove('active'));
    const section = document.getElementById(`section-${sectionId}`);
    if (section) section.style.display = 'block';
    const btn = document.getElementById(`btn-nav-${sectionId}`);
    if (btn) btn.classList.add('active');
    
    if(sectionId === 'pendientes') loadPendientes();
    if(sectionId === 'historial') loadHistorial();
    if(sectionId === 'movimientos') loadGastos(); 
    if(sectionId === 'devoluciones') {
        document.getElementById('dev-resultado-busqueda').innerHTML = "";
        const inputTicket = document.getElementById('dev-ticket-id');
        if (inputTicket) { inputTicket.value = ""; inputTicket.focus(); }
        prepararDevoluciones(); 
    }
};

// Manejo inteligente del menú desplegable
const header = document.querySelector('.pos-header');

// Si tocan un botón de navegación, mantenemos el menú un segundo para que vean el cambio
document.querySelectorAll('.nav-btn-large').forEach(btn => {
    btn.addEventListener('click', () => {
        header.classList.add('active-manual');
        setTimeout(() => {
            header.classList.remove('active-manual');
        }, 800); // Se vuelve a ocultar tras 0.8 segundos de hacer clic
    });
});

// --- 3. COMPORTAMIENTO DEL ESCÁNER ---
document.getElementById('pos-barcode-input')?.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const barcode = e.target.value.trim();
        if (!barcode) return;
        const sectionVenta = document.getElementById('section-venta');
        if (sectionVenta && sectionVenta.style.display !== 'none') {
            const q = query(collection(db, "productos"), where("barcode", "==", barcode));
            const snap = await getDocs(q);
            if (!snap.empty) {
                agregarAlCarrito({ id: snap.docs[0].id, ...snap.docs[0].data() });
                e.target.value = '';
            }
        }
    }
});

// --- 4. BUSCADOR VENTA ---
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
            div.onclick = () => { agregarAlCarrito(p); suggestionsList.style.display = 'none'; barcodeInput.value = ''; barcodeInput.focus(); };
            suggestionsList.appendChild(div);
        });
        suggestionsList.style.display = matches.length ? 'block' : 'none';
    });
}

// --- 5. CARRITO ---
async function agregarAlCarrito(p) {
    const existe = posCart.find(item => item.id === p.id);
    const cantidadDeseada = existe ? existe.qty + 1 : 1;
    if (p.stock !== "∞") {
        const stockDisponible = parseInt(p.stock);
        if (stockDisponible <= 0) return alert(`🚫 Sin stock: "${p.nombre}"`);
        if (cantidadDeseada > stockDisponible) return alert(`⚠️ Solo quedan ${stockDisponible} unidades.`);
    }
    if (existe) { existe.qty++; } else { posCart.push({ id: p.id, nombre: p.nombre, precio: parseFloat(p.precio), qty: 1, stockOriginal: p.stock }); }
    renderCart();
}

function renderCart() {
    const body = document.getElementById('pos-cart-body');
    const discountPercent = parseFloat(document.getElementById('pos-discount').value) || 0;
    body.innerHTML = '';
    let subtotal = 0;
    posCart.forEach((item, index) => {
        const sub = item.precio * item.qty;
        subtotal += sub;
        body.innerHTML += `<tr><td>${item.nombre}</td><td>$${item.precio.toLocaleString()}</td><td><input type="number" value="${item.qty}" min="1" onchange="updateQty(${index}, this.value)" style="width:60px; background:#333; color:white; border:none; padding:8px; border-radius:4px; text-align:center;"></td><td class="subtotal-col">$${sub.toLocaleString()}</td><td onclick="removeItem(${index})" style="cursor:pointer; text-align:center;">❌</td></tr>`;
    });
    totalVenta = subtotal - (subtotal * discountPercent / 100);
    document.getElementById('pos-subtotal').innerText = `$ ${subtotal.toLocaleString()}`;
    document.getElementById('pos-total-price').innerText = `$ ${totalVenta.toLocaleString()}`;
}

window.updateQty = async (index, val) => {
    const item = posCart[index];
    const nuevaCant = parseInt(val) || 1;
    const pDoc = await getDoc(doc(db, "productos", item.id));
    if (pDoc.exists() && pDoc.data().stock !== "∞" && nuevaCant > parseInt(pDoc.data().stock)) {
        alert("🚫 Stock insuficiente.");
        renderCart();
        return;
    }
    posCart[index].qty = nuevaCant;
    renderCart();
};

window.removeItem = (index) => { posCart.splice(index, 1); renderCart(); };
document.getElementById('pos-discount').addEventListener('input', renderCart);

// --- 6. FINALIZAR VENTA ---
document.getElementById('btn-finish-sale').onclick = async () => {
    if (!posCart.length) return alert("Carrito vacío");
    const btn = document.getElementById('btn-finish-sale');
    btn.innerText = "Procesando..."; btn.disabled = true;
    const subtotalVenta = posCart.reduce((acc, item) => acc + (item.precio * item.qty), 0);
    const ventaData = {
        ticketId: "HARD-" + Date.now().toString().slice(-6),
        cliente: document.getElementById('pos-customer-name').value || "Consumidor Final",
        items: posCart,
        subtotal: subtotalVenta,
        descuentoAplicado: (subtotalVenta * parseFloat(document.getElementById('pos-discount').value || 0)) / 100,
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
                await updateDoc(prodRef, { stock: (parseInt(pDoc.data().stock) - item.qty).toString() });
            }
        }
        window.mostrarTicket(ventaData);
        posCart = []; renderCart();
        document.getElementById('pos-customer-name').value = "";
        document.getElementById('pos-discount').value = 0;
    } catch (e) { alert("Error: " + e.message); }
    finally { btn.innerText = "PROCESAR (F2)"; btn.disabled = false; }
};

// --- 7. GESTIÓN DE TICKET (RECALCULO REAL POST-DEVOLUCIÓN) ---
window.mostrarTicket = (v) => {
    const nombreCliente = v.cliente || "Consumidor Final";
    
    // 1. FILTRADO INTELIGENTE: Calculamos la base de dinero real
    // Sumamos solo los productos que NO tienen el estado 'devuelto'
    const subtotalReal = v.items.reduce((acc, i) => {
        if (i.estado !== 'devuelto') {
            return acc + (i.qty * (i.price || i.precio));
        }
        return acc;
    }, 0);

    // 2. AJUSTE DE DESCUENTO: 
    // Usamos el descuento original guardado en la venta
    const desc = v.descuentoAplicado || 0;
    const totalFinal = subtotalReal - desc;

    let fechaLegible = v.fecha?.toDate ? v.fecha.toDate().toLocaleString() : new Date().toLocaleString();

    const html = `
        <div style="display: flex; flex-direction: column; color: black; font-family: 'Courier New', monospace; padding: 5px; text-align: center; background: white; width: 280px; margin: 0 auto;">
            <h2 style="margin:0;">HARD</h2>
            <p style="font-size:10px; margin:0;">REPUESTOS Y LUBRICANTES</p>
            <p style="font-size:11px; margin-top: 5px;">${fechaLegible}</p> 
            <p style="font-size:11px; font-weight:bold;">Ticket: ${v.ticketId}</p>
            <p style="font-size:11px; text-align: left; margin: 10px 0 0 0;">Cliente: ${nombreCliente}</p>
            <hr style="border: none; border-top: 1px dashed #000; margin: 8px 0;">
            
            <div style="text-align: left;">
                ${v.items.map(i => {
                    const esDev = i.estado === 'devuelto';
                    return `
                    <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px; ${esDev ? 'color: red; text-decoration: line-through;' : ''}">
                        <span>${i.qty} x ${i.nombre}</span>
                        <span>$${(i.qty * (i.price || i.precio)).toLocaleString()}</span>
                    </div>`;
                }).join('')}
            </div>

            <hr style="border: none; border-top: 1px dashed #000; margin: 10px 0;">
            
            <div style="display:flex; justify-content:space-between; font-size:12px;">
                <span>Subtotal Neto:</span>
                <span>$${subtotalReal.toLocaleString()}</span>
            </div>
            
            ${desc > 0 ? `
            <div style="display:flex; justify-content:space-between; font-size:12px; color:red;">
                <span>Desc. Original:</span>
                <span>-$${desc.toLocaleString()}</span>
            </div>` : ''}

            <h3 style="text-align:right; margin: 10px 0; font-size: 1.4rem;">TOTAL: $${totalFinal.toLocaleString()}</h3>
            
            <p style="text-align:right; font-size:10px;">Método: ${v.metodo}</p>
            
            <div style="margin-top: 20px; display: flex; justify-content: center;">
                <svg id="barcode-ticket"></svg>
            </div>
            <p style="font-size:9px; margin-top: 10px;">¡Gracias por confiar en HARD!</p>
        </div>`;
    
    document.getElementById('ticket-visual').innerHTML = html;
    document.getElementById('ticket-print-area').innerHTML = html;
    
    setTimeout(() => {
        JsBarcode("#barcode-ticket", v.ticketId, { format: "CODE128", width: 1.1, height: 35, displayValue: false, margin: 0 });
    }, 100);
    
    document.getElementById('modal-ticket').style.display = 'flex';
};

// --- 8. HISTORIAL Y RESUMEN CAJA ---
async function loadHistorial() {
    const list = document.getElementById('historial-list');
    const snapVentas = await getDocs(query(collection(db, "ventas"), orderBy("fecha", "desc")));
    const snapGastos = await getDocs(collection(db, "gastos"));
    
    let cajasHoy = { Efectivo: 0, Transferencia: 0, Tarjeta: 0, Total: 0 };
    let totalGastosHoy = 0;
    let hoyStr = new Date().toLocaleDateString();

    snapGastos.forEach(dg => {
        const g = dg.data();
        if (g.fecha && g.fecha.toDate().toLocaleDateString() === hoyStr) {
            totalGastosHoy += g.monto;
            if (cajasHoy[g.metodo] !== undefined) cajasHoy[g.metodo] -= g.monto;
        }
    });

    let htmlTickets = ""; let ultimaF = "";
    snapVentas.forEach(d => {
        const v = d.data();
        if (!v.fecha) return;
        const fDate = v.fecha.toDate();
        const fStr = fDate.toLocaleDateString();
        if (fStr === hoyStr && v.metodo !== "Pendiente") {
            if (cajasHoy[v.metodo] !== undefined) cajasHoy[v.metodo] += v.total;
            cajasHoy.Total += v.total;
        }
        if (fStr !== ultimaF) {
            if (ultimaF !== "") htmlTickets += `</tbody></table></div></div>`;
            htmlTickets += `<div class="historial-dia-group"><div class="fecha-separador">${fStr === hoyStr ? "HOY - " + fStr : fStr}</div><div class="table-container-v2"><table class="pos-table-v2"><thead><tr><th>Hora</th><th>Ticket / Cliente</th><th>Método</th><th>Total</th><th>Acción</th></tr></thead><tbody>`;
            ultimaF = fStr;
        }
        htmlTickets += `<tr class="historial-row"><td>${fDate.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td><td><strong>${v.ticketId}</strong><br><small>${v.cliente}</small></td><td>${v.metodo}</td><td>$${v.total.toLocaleString()}</td><td><button onclick='reimprimirTicket(${JSON.stringify(v)})' class="btn-ver-ticket">📄 Ver</button></td></tr>`;
    });

    cajasHoy.Total -= totalGastosHoy;
    const resumenHTML = `
        <div class="scanner-box-v2" style="margin-bottom:20px;">
            <div class="section-header-v2"><span class="icon">📊</span><h2>Resumen de Caja</h2></div>
            <div class="caja-resumen-grid" style="display:grid; grid-template-columns: repeat(4, 1fr); gap:15px;">
                <div class="card-resumen" style="background:#1a1a1a; padding:15px; border-radius:10px; border:1px solid #333; text-align:center;">💵 Efectivo<br><span>$${cajasHoy.Efectivo.toLocaleString()}</span></div>
                <div class="card-resumen" style="background:#1a1a1a; padding:15px; border-radius:10px; border:1px solid #333; text-align:center;">📱 Transf.<br><span>$${cajasHoy.Transferencia.toLocaleString()}</span></div>
                <div class="card-resumen" style="background:#1a1a1a; padding:15px; border-radius:10px; border:1px solid #333; text-align:center;">💳 Tarjeta<br><span>$${cajasHoy.Tarjeta.toLocaleString()}</span></div>
                <div class="card-resumen" style="background:#1a1a1a; padding:15px; border-radius:10px; border:3px solid var(--hard-red); text-align:center;">Total Neto💰<br><span style="color:var(--hard-red); font-size:1.4rem;">$${cajasHoy.Total.toLocaleString()}</span></div>
            </div>
            <div style="margin-top:15px; color:#ff4444; font-weight:bold;">📉 GASTOS VARIOS HOY: -$${totalGastosHoy.toLocaleString()}</div>
        </div>`;
    list.innerHTML = resumenHTML + htmlTickets + `</tbody></table></div></div>`;
}

// --- 9. DEVOLUCIONES ---
async function prepararDevoluciones() {
    const q = query(collection(db, "ventas"), orderBy("fecha", "desc"), limit(100));
    const snap = await getDocs(q);
    ventasParaDevolucion = [];
    snap.forEach(d => ventasParaDevolucion.push({ id: d.id, ...d.data() }));
}

document.getElementById('dev-ticket-id')?.addEventListener('input', (e) => {
    const term = e.target.value.trim().toUpperCase();
    const resultDiv = document.getElementById('dev-resultado-busqueda');
    if (term.length < 2) { resultDiv.innerHTML = ""; return; }
    const matches = ventasParaDevolucion.filter(v => v.ticketId.includes(term) || v.cliente.toLowerCase().includes(term.toLowerCase()));
    if (matches.length === 0) { resultDiv.innerHTML = "<p style='color:#666; padding:10px;'>Buscando ticket...</p>"; return; }

    resultDiv.innerHTML = matches.slice(0, 2).map(v => `
        <div class="scanner-box-v2" style="background: var(--bg-dark-panel); padding: 20px; border: 1px solid #333; margin-bottom:15px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3>Ticket: ${v.ticketId} - ${v.cliente}</h3>
                <span style="background:var(--hard-red); padding:4px 8px; border-radius:4px; font-size:0.7rem;">PAGO: ${v.metodo.toUpperCase()}</span>
            </div>
            <table class="pos-table-v2">
                <thead><tr><th>Producto</th><th>Cant. Orig.</th><th>Devolver</th><th>Acción</th></tr></thead>
                <tbody>
                    ${v.items.map((item, index) => {
                        const esDev = item.estado === 'devuelto';
                        return `<tr style="${esDev ? 'color:#ff4444; text-decoration:line-through; background:rgba(255,0,0,0.05);' : ''}">
                            <td>${item.nombre}</td><td>${item.qty}</td>
                            <td>${esDev ? 'DEVUELTO' : `<input type="number" id="cant-dev-${v.id}-${index}" value="1" min="1" max="${item.qty}" style="width:60px; background:#000; color:var(--scanner-green); border:1px solid #444; text-align:center;">`}</td>
                            <td>${esDev ? '-' : `<div style="display:flex; gap:5px;"><button onclick="procesarDevolucionIndividual('${v.id}', ${index}, true)" class="btn-ver-ticket" style="background:#2e7d32; font-size:0.7rem;">🔄 Stock</button><button onclick="procesarDevolucionIndividual('${v.id}', ${index}, false)" class="btn-ver-ticket" style="background:#d32f2f; font-size:0.7rem;">🗑️ Roto</button></div>`}</td></tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`).join('');
});

window.procesarDevolucionIndividual = async (ventaDocId, itemIndex, vuelveAStock) => {
    const input = document.getElementById(`cant-dev-${ventaDocId}-${itemIndex}`);
    const cantADevolver = parseInt(input.value);
    if (!confirm(`¿Devolver ${cantADevolver} unidad(es)?`)) return;
    try {
        const ventaRef = doc(db, "ventas", ventaDocId);
        const vSnap = await getDoc(ventaRef);
        const ventaData = vSnap.data();
        const item = ventaData.items[itemIndex];
        if (vuelveAStock) {
            const prodRef = doc(db, "productos", item.id);
            const pSnap = await getDoc(prodRef);
            if (pSnap.exists() && pSnap.data().stock !== "∞") {
                await updateDoc(prodRef, { stock: (parseInt(pSnap.data().stock) + cantADevolver).toString() });
            }
        }
        const nuevosItems = [...ventaData.items];
        if (cantADevolver >= item.qty) { nuevosItems[itemIndex].estado = 'devuelto'; } 
        else { nuevosItems[itemIndex].qty -= cantADevolver; nuevosItems.push({ ...item, qty: cantADevolver, estado: 'devuelto' }); }
        await updateDoc(ventaRef, { items: nuevosItems });
        await addDoc(collection(db, "gastos"), { motivo: `DEV PARCIAL (${cantADevolver}): ${item.nombre} (ID: ${ventaData.ticketId})`, monto: item.precio * cantADevolver, metodo: ventaData.metodo, fecha: serverTimestamp() });
        alert("✅ Éxito"); loadHistorial();
        prepararDevoluciones().then(() => document.getElementById('dev-ticket-id').dispatchEvent(new Event('input')));
    } catch (e) { alert(e.message); }
};

// --- 10. MOVIMIENTOS / GASTOS (CORREGIDO DISEÑO IGUAL A HISTORIAL) ---
window.registrarGasto = async () => {
    const mot = document.getElementById('gasto-motivo').value;
    const mon = parseFloat(document.getElementById('gasto-monto').value);
    const met = document.getElementById('gasto-metodo').value;
    if (!mot || isNaN(mon)) return alert("Completá datos.");
    await addDoc(collection(db, "gastos"), { motivo: mot, monto: mon, metodo: met, fecha: serverTimestamp() });
    document.getElementById('gasto-motivo').value = ''; document.getElementById('gasto-monto').value = '';
    loadGastos(); alert("Gasto registrado!");
};

async function loadGastos() {
    const contenedor = document.getElementById('gastos-contenedor-estetico');
    const snap = await getDocs(query(collection(db, "gastos"), orderBy("fecha", "desc")));
    let html = ""; 
    let ultimaFecha = ""; 
    let hoyStr = new Date().toLocaleDateString();

    snap.forEach(d => {
        const g = d.data();
        if(!g.fecha) return;
        const fDate = g.fecha.toDate();
        const fStr = fDate.toLocaleDateString();
        
        if (fStr !== ultimaFecha) {
            // Si no es el primer grupo, cerramos las etiquetas de la tabla anterior
            if (ultimaFecha !== "") html += `</tbody></table></div></div>`;

            // Creamos la estructura de "caja" igual al Historial (Imagen 4e2d08)
            html += `
                <div class="historial-dia-group" style="margin-bottom: 25px;">
                    <div class="fecha-separador">${fStr === hoyStr ? "HOY - " + fStr : fStr}</div>
                    <div class="table-container-v2">
                        <table class="pos-table-v2">
                            <thead>
                                <tr>
                                    <th style="width: 15%;">Hora</th>
                                    <th style="width: 45%;">Motivo</th>
                                    <th style="width: 20%;">Método</th>
                                    <th style="width: 20%; text-align: right;">Monto</th>
                                </tr>
                            </thead>
                            <tbody>`;
            ultimaFecha = fStr;
        }
        
        // Filas con el estilo .historial-row para mantener la coherencia visual
        html += `
            <tr class="historial-row">
                <td style="color: var(--text-muted); font-size: 0.85rem;">${fDate.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</td>
                <td style="text-transform: uppercase;"><strong>${g.motivo}</strong></td>
                <td>${g.metodo}</td>
                <td style="color: #ff4444; font-weight: bold; text-align: right;">-$${g.monto.toLocaleString()}</td>
            </tr>`;
    });

    // Cierre final del último grupo
    if (html !== "") html += `</tbody></table></div></div>`;
    
    contenedor.innerHTML = html || "<p style='text-align:center; padding:20px; color:#555;'>No hay movimientos registrados.</p>";
}

// --- 11. PENDIENTES ---
async function loadPendientes() {
    const list = document.getElementById('pendientes-list');
    const q = query(collection(db, "ventas"), where("metodo", "==", "Pendiente"));
    const snap = await getDocs(q);
    let buscadorHTML = `<div style="margin-bottom:20px; background:var(--bg-dark-panel); padding:10px; border-radius:8px; border:1px solid var(--border-color);"><input type="text" id="pendientes-search" placeholder="🔍 Buscar fiado por nombre o ticket..." style="width:100%; background:transparent; border:none; color:white; outline:none;" oninput="window.filterPendientes()"></div>`;
    if (snap.empty) { list.innerHTML = buscadorHTML + `<p style="padding:20px; color:#555;">No hay cuentas pendientes.</p>`; return; }
    let html = buscadorHTML + `<div class="pendientes-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:20px;">`;
    snap.forEach(d => {
        const v = d.data();
        html += `<div class="fiado-card" data-search="${v.cliente.toLowerCase()} ${v.ticketId.toLowerCase()}" style="background:var(--bg-dark-panel); border:1px solid var(--border-color); border-radius:12px; padding:20px; border-left:5px solid var(--hard-red);"><div class="fiado-header"><span class="fiado-ticket" style="font-size:0.8rem; color:#888;">${v.ticketId}</span></div><h4 class="fiado-cliente" style="font-size:1.2rem; margin:10px 0; color:white;">${v.cliente}</h4><div class="fiado-monto" style="font-size:1.8rem; color:var(--hard-red); font-weight:800; margin-bottom:15px;">$ ${v.total.toLocaleString()}</div><div class="fiado-footer" style="display:flex; gap:10px;"><button onclick='reimprimirTicket(${JSON.stringify(v)})' class="btn-view-fiado" style="flex:1; padding:10px; background:#333; color:white; border:none; border-radius:6px; cursor:pointer;">Ver</button><button onclick="window.cobrarFiado('${d.id}','${v.cliente}',${v.total})" class="btn-cobrar-v2" style="flex:1; padding:10px; background:#2e7d32; color:white; border:none; border-radius:6px; cursor:pointer;">Cobrar</button></div></div>`;
    });
    list.innerHTML = html + `</div>`;
}

window.filterPendientes = () => {
    const term = document.getElementById('pendientes-search').value.toLowerCase();
    document.querySelectorAll('.fiado-card').forEach(card => card.style.display = card.getAttribute('data-search').includes(term) ? 'block' : 'none');
};

window.cobrarFiado = (id, cli, tot) => {
    fiadoActual = { id, cli, tot };
    document.getElementById('cobrar-titulo').innerText = `Cobrar $${tot.toLocaleString()} a ${cli}`;
    document.getElementById('modal-cobrar-fiado').style.display = 'flex';
};

window.confirmarCobro = async (met) => {
    if(!fiadoActual) return;
    await updateDoc(doc(db, "ventas", fiadoActual.id), { metodo: met, fecha_cobro: serverTimestamp() });
    document.getElementById('modal-cobrar-fiado').style.display = 'none'; 
    loadPendientes(); loadHistorial();
};

function iniciarReloj() {
    setInterval(() => {
        const ahora = new Date();
        document.getElementById('pos-clock-date').innerText = ahora.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' });
        document.getElementById('pos-clock-time').innerText = ahora.toLocaleTimeString('es-AR');
    }, 1000);
}

window.reimprimirTicket = (v) => window.mostrarTicket(v);
window.cerrarTicket = () => document.getElementById('modal-ticket').style.display = 'none';
window.cerrarModalCobro = () => document.getElementById('modal-cobrar-fiado').style.display = 'none';
window.ejecutarImpresion = () => { window.print(); barcodeInput.focus(); };
document.addEventListener('keydown', (e) => { if(e.key === 'F2') document.getElementById('btn-finish-sale').click(); });

iniciarReloj();
