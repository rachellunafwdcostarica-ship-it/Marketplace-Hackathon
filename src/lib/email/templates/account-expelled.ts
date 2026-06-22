// Plantilla HTML de email para notificar a un usuario de su expulsión (≥ 5 strikes)
// Sigue la identidad visual de FWD Talent

const MOTIVO_LABELS: Record<string, string> = {
  no_entrego: 'No entregó el proyecto',
  abandono_proyecto: 'Abandonó el proyecto',
  conducta_inapropiada: 'Conducta inapropiada',
  calificacion_baja_repetida: 'Calificación baja repetida',
  fraude: 'Fraude o engaño',
  ghosting: 'Sin respuesta (ghosting)',
  otro: 'Otro motivo',
}

export interface AccountExpelledData {
  nombre: string
  correo: string
  cantidadStrikes: number
  motivosHistorial: string[]
}

export function accountExpelledHtml({
  nombre,
  cantidadStrikes,
  motivosHistorial,
}: AccountExpelledData): string {
  const headerBg = '#EC008C' // Destructive color for Expulsión

  const motivosHtml = motivosHistorial
    .map((motivo, index) => {
      const label = MOTIVO_LABELS[motivo] ?? motivo
      return `<li style="margin-bottom: 4px;">Strike ${index + 1}: <strong>${label}</strong></li>`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cuenta Expulsada — FWD Talent</title>
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
                Tu cuenta ha sido expulsada<span style="color:#FFCB05;">.</span>
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
                Te informamos que tu cuenta en FWD Talent ha sido <strong>expulsada permanentemente</strong> 
                debido a que has acumulado <strong>${cantidadStrikes} strikes</strong>. 
                El acceso a la plataforma ha sido revocado.
              </p>

              <!-- Historial Motivos Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#f9f9f9;border-left:4px solid ${headerBg};border-radius:0 8px 8px 0;padding:16px 20px;">
                    <p style="margin:0 0 10px;color:#6b7280;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">
                      Historial de Infracciones
                    </p>
                    <ul style="margin:0;padding-left:16px;color:#111827;font-size:13px;line-height:1.5;">
                      ${motivosHtml}
                    </ul>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                Este correo fue generado automáticamente por el sistema de moderación de FWD Talent.
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

export function accountExpelledSubject(): string {
  return 'Aviso importante: Tu cuenta en FWD Talent ha sido expulsada'
}
