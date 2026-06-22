// Plantilla HTML de email para notificar a un usuario que su cuenta ha sido restaurada
// Sigue la identidad visual de FWD Talent

export interface AccountRestoredData {
  nombre: string
  dashboardUrl: string
}

export function accountRestoredHtml({
  nombre,
  dashboardUrl,
}: AccountRestoredData): string {
  const headerBg = '#20BEC6' // Cyan/Teal color from FWD palette indicating Success/Validation

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Acceso Restaurado — FWD Talent</title>
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
                Tu acceso ha sido restaurado<span style="color:#FFCB05;">.</span>
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
                Te informamos que un administrador ha revisado tu caso y ha decidido <strong>restaurar el acceso</strong> a tu cuenta de FWD Talent. 
                Tus strikes han sido reiniciados a cero (0).
              </p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
                Por favor, tené en cuenta que futuras infracciones pueden resultar en la pérdida permanente de la cuenta. Te invitamos a repasar nuestras normas comunitarias.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:50px;background-color:#0A6CB9;">
                    <a href="${dashboardUrl}"
                       style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:50px;">
                      Iniciar sesión
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

export function accountRestoredSubject(): string {
  return 'Buenas noticias: Tu acceso a FWD Talent ha sido restaurado'
}
