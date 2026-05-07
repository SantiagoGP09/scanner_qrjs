const API_BASE_URL = "https://rocakids.com.co/api";
const SCANNER_ID = "reader";

let scanner = null;
let currentRegistroId = null;
let hasScanned = false;

const elements = {
    info: document.getElementById("info"),
    result: document.getElementById("result"),
    status: document.getElementById("scannerStatus"),
};

function setStatus(message) {
    if (elements.status) elements.status.textContent = message;
}

function setResult(message, isLoading = false) {
    if (!elements.result) return;
    elements.result.innerHTML = isLoading
        ? `<span class="loading">${message}</span>`
        : message;
}

function safeValue(value, fallback = "No registrado") {
    if (value === null || value === undefined || value === "") return fallback;
    return String(value);
}

function showToast(message, type = "success") {
    const previousToast = document.querySelector(".toast-message");
    if (previousToast) previousToast.remove();

    const toast = document.createElement("div");
    toast.className = `toast-message ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    window.setTimeout(() => toast.classList.add("show"), 20);
    window.setTimeout(() => {
        toast.classList.remove("show");
        window.setTimeout(() => toast.remove(), 220);
    }, 3600);
}

function renderSuccessCard(reg) {
    currentRegistroId = reg.id;

    elements.info.className = "info-card";
    elements.info.innerHTML = `
        <input id="idReg" type="hidden" value="${safeValue(reg.id, "")}">
        <div class="result-icon success" aria-hidden="true">✓</div>
        <h3>Escaneo exitoso</h3>
        <p class="text-muted mb-0">El registro fue encontrado y se está marcando como leído.</p>

        <div class="result-grid">
            <div class="info-item">
                <span>Ficho</span>
                <strong>${safeValue(reg.ficho)}</strong>
            </div>
            <div class="info-item">
                <span>Edad</span>
                <strong>${safeValue(reg.edad)} años</strong>
            </div>
            <div class="info-item full">
                <span>Nombre del niño</span>
                <strong>${safeValue(reg.nombres)}</strong>
            </div>
            <div class="info-item">
                <span>Acudiente #1</span>
                <strong>${safeValue(reg.nombrep1)}<br>${safeValue(reg.celular1, "Sin celular")}</strong>
            </div>
            <div class="info-item">
                <span>Acudiente #2</span>
                <strong>${safeValue(reg.nombrep2)}<br>${safeValue(reg.celular2, "Sin celular")}</strong>
            </div>
            <div class="info-item full">
                <span>Fecha y hora del registro</span>
                <strong>${safeValue(reg.fechacreacion)}</strong>
            </div>
        </div>

        <div class="action-row">
            <button id="btnRecargar" class="action-button primary" type="button" onclick="reload()">Escanear de nuevo</button>
            <button id="btnEstado" class="action-button warning" type="button" onclick="actulizarStatusACTIVO()">Activar código</button>
        </div>
    `;
}

function renderNotFoundCard(ficho) {
    currentRegistroId = null;

    elements.info.className = "info-card";
    elements.info.innerHTML = `
        <input id="idReg" type="hidden">
        <div class="result-icon warning" aria-hidden="true">!</div>
        <h3>No se encontró el registro</h3>
        <p class="text-muted mb-0">
            No hay registros disponibles con el ficho <strong>${ficho}</strong>, o el código ya se encuentra en estado <strong>LEÍDO</strong>.
        </p>
        <div class="action-row">
            <button id="btnRecargar" class="action-button primary" type="button" onclick="reload()">Escanear de nuevo</button>
        </div>
    `;
}

function renderScannerErrorCard(message) {
    setStatus("Scanner no disponible");
    setResult("No se pudo inicializar el lector QR.");
    elements.info.className = "info-card";
    elements.info.innerHTML = `
        <div class="result-icon warning" aria-hidden="true">!</div>
        <h3>No se pudo abrir el scanner</h3>
        <p class="text-muted mb-0">${message}</p>
        <div class="action-row">
            <button class="action-button primary" type="button" onclick="reload()">Intentar de nuevo</button>
        </div>
    `;
}

async function updateStatus(id, estado) {
    const response = await fetch(`${API_BASE_URL}/kid/scanner/actu/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
    });

    if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}`);
    }

    return response.json();
}

async function buscarInfo(result) {
    const ficho = parseInt(result, 10);

    if (Number.isNaN(ficho)) {
        setResult("El código escaneado no corresponde a un ficho válido.");
        showToast("El QR no contiene un número de ficho válido.", "error");
        renderNotFoundCard("inválido");
        return;
    }

    try {
        setStatus("Consultando registro");
        setResult(`Buscando ficho ${ficho}...`, true);

        const response = await fetch(`${API_BASE_URL}/kid/scanner/${ficho}`);

        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status}`);
        }

        const registro = await response.json();

        if (Array.isArray(registro) && registro.length > 0) {
            const reg = registro[0];
            renderSuccessCard(reg);
            setResult("Registro encontrado correctamente.");
            setStatus("Registro encontrado");

            const data = await updateStatus(reg.id, "LEIDO");
            if (data.status === "ok") {
                showToast(data.message || "Código marcado como leído.", "success");
            } else {
                showToast(data.error || "No se pudo marcar como leído.", "error");
            }
        } else {
            renderNotFoundCard(ficho);
            setResult("No se encontraron registros disponibles.");
            setStatus("Sin resultados");
        }
    } catch (error) {
        console.error("Error:", error);
        setResult("Ocurrió un error consultando el registro.");
        setStatus("Error de consulta");
        showToast("No se pudo consultar el registro. Revisa la conexión o la API.", "error");
    }
}

function success(result) {
    if (hasScanned) return;
    hasScanned = true;

    setStatus("QR detectado");

    if (scanner) {
        scanner.clear().catch((error) => {
            console.warn("No se pudo limpiar el scanner:", error);
        });
    }

    buscarInfo(result);
}

function error(err) {
    if (err !== "QR code parse error, error = D: No MultiFormat Readers were able to detect the code.") {
        console.warn("Scanner:", err);
    }
}

async function actulizarStatus(Dk) {
    try {
        const data = await updateStatus(Dk, "LEIDO");
        if (data.status === "ok") {
            showToast(data.message || "Código marcado como leído.", "success");
        } else {
            showToast(data.error || "No se pudo actualizar el código.", "error");
        }
    } catch (error) {
        console.error("Error:", error);
        showToast("Error actualizando el estado del código.", "error");
    }
}

async function actulizarStatusACTIVO() {
    const idInput = document.getElementById("idReg");
    const id = idInput?.value || currentRegistroId;
    const button = document.getElementById("btnEstado");

    if (!id) {
        showToast("No hay un registro activo para actualizar.", "error");
        return;
    }

    try {
        if (button) {
            button.disabled = true;
            button.textContent = "Activando...";
        }

        const data = await updateStatus(id, "ACTIVO");

        if (data.status === "ok") {
            showToast(data.message || "Código activado correctamente.", "success");
            setStatus("Código activado");
        } else {
            showToast(data.error || "No se pudo activar el código.", "error");
        }
    } catch (error) {
        console.error("Error:", error);
        showToast("Error activando el código.", "error");
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Activar código";
        }
    }
}

function reload() {
    window.location.reload();
}

function initScanner() {
    const readerElement = document.getElementById(SCANNER_ID);

    if (!readerElement) {
        renderScannerErrorCard("No existe el contenedor #reader en el HTML.");
        return;
    }

    if (typeof Html5QrcodeScanner === "undefined") {
        renderScannerErrorCard("La librería html5-qrcode no cargó correctamente. Revisa conexión, CDN o caché del navegador.");
        return;
    }

    try {
        scanner = new Html5QrcodeScanner(SCANNER_ID, {
            qrbox: {
                width: 250,
                height: 250,
            },
            fps: 30,
            rememberLastUsedCamera: true,
            aspectRatio: 1.0,
        });

        scanner.render(success, error);
        setStatus("Listo para escanear");
    } catch (error) {
        console.error("Error inicializando scanner:", error);
        renderScannerErrorCard("El navegador no permitió inicializar la cámara. Verifica permisos y que la página esté cargando con HTTPS.");
    }
}

window.reload = reload;
window.actulizarStatus = actulizarStatus;
window.actulizarStatusACTIVO = actulizarStatusACTIVO;

window.addEventListener("load", initScanner);
