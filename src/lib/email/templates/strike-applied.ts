// Plantilla HTML de email para notificar a un usuario que recibió un strike
// Sigue la identidad visual de FWD Talent (colores, tipografía, estilo de correo)

const MOTIVO_LABELS: Record<string, string> = {
  no_entrego: 'No entregó el proyecto',
  abandono_proyecto: 'Abandonó el proyecto',
  conducta_inapropiada: 'Conducta inapropiada',
  calificacion_baja_repetida: 'Calificación baja repetida',
  fraude: 'Fraude o engaño',
  ghosting: 'Sin respuesta (ghosting)',
  otro: 'Otro motivo',
}

export interface StrikeAppliedData {
  nombre: string
  correo: string
  motivo: string
  descripcion?: string | undefined
  cantidadStrikes: number
  maxStrikes: number
  dashboardUrl: string
}

export function strikeAppliedHtml({
  nombre,
  motivo,
  descripcion,
  cantidadStrikes,
  maxStrikes,
  dashboardUrl,
}: StrikeAppliedData): string {
  const motivoLabel = MOTIVO_LABELS[motivo] ?? motivo
  const esSuspension = cantidadStrikes >= maxStrikes
  const strikesRestantes = maxStrikes - cantidadStrikes

  const headerBg = esSuspension ? '#EC008C' : '#662D91'
  const headerTitle = esSuspension
    ? 'Tu cuenta ha sido suspendida'
    : `Has recibido un strike (${cantidadStrikes}/${maxStrikes})`

  const cuerpoMensaje = esSuspension
    ? `Tu cuenta ha sido suspendida temporalmente por acumular ${cantidadStrikes} strikes en la plataforma FWD Talent.
       Si considerás que esto es un error, podés comunicarte con el equipo de soporte.`
    : `Te informamos que has recibido <strong>1 strike</strong> en tu cuenta de FWD Talent.
       Actualmente tienes <strong>${cantidadStrikes} de ${maxStrikes} strikes</strong>.
       ${strikesRestantes > 0 ? `Te restan <strong>${strikesRestantes} strike${strikesRestantes !== 1 ? 's' : ''}</strong> antes de que tu cuenta sea suspendida.` : ''}`

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Strike aplicado — FWD Talent</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Franja multicolor FWD -->
          <tr>
            <td style="padding:0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#008FD4;height:4px;"></td>
                  <td style="background:#662D91;height:4px;"></td>
                  <td style="background:#20BEC6;height:4px;"></td>
                  <td style="background:#FFCB05;height:4px;"></td>
                  <td style="background:#F7901E;height:4px;"></td>
                  <td style="background:#EC008C;height:4px;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="background-color:${headerBg};padding:32px 40px;">
              <p style="margin:0;color:#ffffff;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">FWD Talent Marketplace</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:26px;font-weight:800;line-height:1.2;">
                ${headerTitle}<span style="color:#FFCB05;">.</span>
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">
                Hola <strong>${nombre}</strong>,
              </p>
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
                ${cuerpoMensaje}
              </p>

              <!-- Motivo Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#f9f9f9;border-left:4px solid ${headerBg};border-radius:0 8px 8px 0;padding:16px 20px;">
                    <p style="margin:0 0 6px;color:#6b7280;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">Motivo del strike</p>
                    <p style="margin:0;color:#111827;font-size:14px;font-weight:600;">${motivoLabel}</p>
                    ${descripcion ? `<p style="margin:8px 0 0;color:#4b5563;font-size:13px;line-height:1.5;">${descripcion}</p>` : ''}
                  </td>
                </tr>
              </table>

              ${
                !esSuspension
                  ? `
              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:50px;background-color:#0A6CB9;">
                    <a href="${dashboardUrl}"
                       style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:50px;">
                      Ver mi cuenta
                    </a>
                  </td>
                </tr>
              </table>`
                  : ''
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                Este correo fue generado automáticamente por el sistema de moderación de FWD Talent.
                Si tenés dudas, contactate con el equipo de soporte.
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

export function strikeAppliedSubject(
  cantidadStrikes: number,
  maxStrikes: number,
): string {
  if (cantidadStrikes >= maxStrikes) {
    return 'Tu cuenta en FWD Talent ha sido suspendida'
  }
  return `Strike aplicado en tu cuenta de FWD Talent (${cantidadStrikes}/${maxStrikes})`
}
