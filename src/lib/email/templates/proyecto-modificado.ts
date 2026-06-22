interface ProyectoModificadoData {
  nombre: string
  tituloProyecto: string
  urlProyecto: string
}

/**
 * Escapa el texto que entra al HTML del correo. El título del proyecto y el
 * nombre son contenido generado por usuarios: sin escapar romperían el HTML o
 * abrirían una inyección. La `urlProyecto` la construye el servidor (no es input
 * del usuario), pero igual se escapa por higiene.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Correo al oferente cuando el empresario edita la descripción de un proyecto al
 * que ya postuló (es-only, igual que `admin-invite.ts`: no se guarda el
 * idioma del usuario). Mismo layout de marca que el resto de correos FWD.
 */
export function proyectoModificadoHtml({
  nombre,
  tituloProyecto,
  urlProyecto,
}: ProyectoModificadoData): string {
  const nombreSafe = escapeHtml(nombre)
  const tituloSafe = escapeHtml(tituloProyecto)
  const urlSafe = escapeHtml(urlProyecto)

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Un proyecto al que postulaste cambió — FWD Talent</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#662D91;padding:32px 40px;">
              <p style="margin:0;color:#ffffff;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">FWD Talent Marketplace</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:28px;font-weight:800;line-height:1.2;">
                Un proyecto que seguís cambió<span style="color:#FFCB05;">.</span>
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">
                Hola <strong>${nombreSafe}</strong>,
              </p>
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
                El empresario actualizó la descripción del proyecto
                <strong>${tituloSafe}</strong>, al que ya te postulaste.
              </p>
              <p style="margin:0 0 32px;color:#374151;font-size:15px;line-height:1.6;">
                Revisá los cambios para confirmar que tu postulación sigue alineada con lo que pide.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:50px;background-color:#0A6CB9;">
                    <a href="${urlSafe}"
                       style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:50px;">
                      Ver el proyecto
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                Recibís este correo porque tenés una postulación activa en este proyecto.
              </p>
              <p style="margin:8px 0 0;color:#9ca3af;font-size:12px;">
                &copy; 2026 FWD Talent. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function proyectoModificadoSubject(tituloProyecto: string): string {
  return `El proyecto "${tituloProyecto}" actualizó su descripción`
}
