const scanner = new Html5QrcodeScanner('reader', { 
    // Inicializo el scanner
    qrbox: {
        width: 250,
        height: 250,
    },  // Defino dimenciones del qrbox 
    fps: 30, // Frames 
});


scanner.render(success, error);
// Retornos

function success(result) {
    buscarInfo(result);
    scanner.clear();
    //document.getElementById('reader').remove();
}

const buscarInfo = async  (result) => {

    const fecha = new Date();
    const id2 = `${fecha.getFullYear()}-${(fecha.getMonth() + 1).toString().padStart(2, '0')}-${fecha.getDate().toString().padStart(2, '0')} ${fecha.getHours().toString().padStart(2, '0')}:${fecha.getMinutes().toString().padStart(2, '0')}:${fecha.getSeconds().toString().padStart(2, '0')}`;
    let ficho = parseInt(result, 10);
    const id=ficho;
    //console.log(id)
    //console.log(id2)
    const response = await fetch("https://rocakids.com.co:4014/api/kid/scanner/"+id+"/"+id2); // PRODUCCION
    //const response = await fetch("https://localhost:4014/api/kid/scanner/"+id+"/"+id2); // PRUEBAS
    const registro = await response.json();
    const Dk=registro[0].id;
    registro.forEach((reg) => {
        document.getElementById('info').innerHTML = `
        <h2>Escaneo Exitoso!</h2>
        <p>El numero del ficho es: ${reg.ficho} <br></p>
        <p>El nombre del niño es: ${reg.nombres} <br></p>
        <p>Edad: ${reg.edad} <br></p>
        <p>Informacion del acudiente #1: <br> ${reg.nombrep1} <br> ${reg.celular1} <br></p>
        <p>Informacion del acudiente #2: <br> ${reg.nombrep2} <br> ${reg.celular2} <br></p>
        <p>Fecha y hora del registro: ${reg.fechacreacion} <br></p>
        <button id="btnRecargar" class="btn btn-primary" onclick="reload()">Escanear de nuevo</button>
        `;
    });
    await actulizarStatus(Dk);  
}

const actulizarStatus = async  (Dk) => {
    const id = Dk;
    const datos = {
        estado: 'LEIDO'
    };
    //const response =  fetch("https://localhost:4014/api/kid/scanner/actu/"+id,{ // PRUEBAS
    const response =  fetch("https://rocakids.com.co:4014/api/kid/scanner/actu/"+id,{
        method:'PUT',
        headers:{'Content-Type': 'application/json'},
        body:JSON.stringify(datos)
    }).then(response => response.json())
    .then(data => {
    if (data.status == 'ok') {
        alert('La solicitud se realizó con éxito. Respuesta: ' + data.message);
    } else {
        alert('Se produjo un error en la solicitud. Mensaje de error: ' + data.error);
    }
    })
    .catch(error => console.error('Error:', error));         
};


function error(err) {
    if (err != 'QR code parse error, error = D: No MultiFormat Readers were able to detect the code.') {
        alert('Se esta presentando el siguiente error: ' + err); 
    }
};

var btnRecargar = document.getElementById("btnRecargar");

// Agregar un escuchador de eventos para esperar a que el botón sea clicado
function reload() {
// Recargar la página actual
    location.reload();
};