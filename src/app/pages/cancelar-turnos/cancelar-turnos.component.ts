import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-cancelar-turnos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cancelar-turnos.component.html',
  styleUrls: ['./cancelar-turnos.component.scss']
})
export class CancelarTurnosComponent implements OnInit {
  // Número de teléfono de la barbería/local (formato internacional sin +)
  telefonoLocal = '5491112345678'; 
  
  mensajeEstado = 'Procesando tu solicitud...';
  subtitulo = 'Te estamos redirigiendo a WhatsApp para coordinar la cancelación con el local.';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    // Capturamos el ID por si querés incluirlo en el mensaje
    const turnoId = this.route.snapshot.paramMap.get('id');

    // Armamos el texto predeterminado para el chat
    let textoMsg = '¡Hola! Quisiera solicitar la cancelación de mi turno.';
    if (turnoId) {
      textoMsg = `¡Hola! Quisiera cancelar mi reserva (Turno #${turnoId}).`;
    }

    const urlWhatsApp = `https://wa.me/${this.telefonoLocal}?text=${encodeURIComponent(textoMsg)}`;

    // Damos un delay de 2 segundos para que el usuario lea la pantalla y luego redirigimos
    setTimeout(() => {
      window.location.href = urlWhatsApp;
    }, 2000);
  }
}