interface ProjectCancelledProps {
  nombre: string
  tituloProyecto: string
  motivo: string
}

export function projectCancelledSubject(tituloProyecto: string): string {
  return `Proyecto cancelado: ${tituloProyecto}`
}

export function projectCancelledHtml({
  nombre,
  tituloProyecto,
  motivo,
}: ProjectCancelledProps): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Proyecto Cancelado</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#ec008c;padding:32px 40px;">
              <p style="margin:0;color:#ffffff;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">FWD Talent Marketplace</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:28px;font-weight:800;line-height:1.2;">
                Proyecto Cancelado
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">
                Hola <strong>${nombre}</strong>,
              </p>
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
                Te informamos que tu proyecto <strong>"${tituloProyecto}"</strong> ha sido cancelado por el equipo de moderación debido al incumplimiento de nuestras políticas.
              </p>
              <div style="background: #fdf2f8; border-left: 4px solid #ec008c; padding: 16px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; font-weight: bold; color: #ec008c;">Motivo de la cancelación:</p>
                <p style="margin: 0; font-style: italic; color: #831843;">"${motivo}"</p>
              </div>
              <p style="margin:0 0 32px;color:#374151;font-size:15px;line-height:1.6;">
                Esta cancelación es definitiva. Si tienes consultas, puedes responder directamente a este correo para ponerte en contacto con nuestro equipo de soporte.
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
