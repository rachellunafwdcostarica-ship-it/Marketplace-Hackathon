interface AccountVerificationData {
  nombre: string
  confirmUrl: string
  code: string
}

/**
 * Correo de verificación del registro (RF-01 / RF-02). Lleva el enlace de
 * confirmación y, además, el código para la pantalla `/verify-email`. El enlace
 * expira en 24 horas (RF-02). Es-only, como el resto de los templates.
 */
export function accountVerificationHtml({
  nombre,
  confirmUrl,
  code,
}: AccountVerificationData): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirmá tu correo — FWD Talent</title>
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
                Confirmá tu correo<span style="color:#FFCB05;">.</span>
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">
                Hola <strong>${nombre}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
                Creaste una cuenta en FWD Talent. Para activarla, confirmá que este
                correo es tuyo con el botón o ingresando el código en la plataforma.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:50px;background-color:#0A6CB9;">
                    <a href="${confirmUrl}"
                       style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:50px;">
                      Confirmar mi correo
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Código -->
              <p style="margin:28px 0 8px;color:#6b7280;font-size:13px;line-height:1.5;">
                ¿Preferís el código? Ingresalo en la pantalla de verificación:
              </p>
              <p style="margin:0;font-size:28px;font-weight:800;letter-spacing:0.25em;color:#0A6CB9;font-family:'JetBrains Mono',monospace;">
                ${code}
              </p>

              <p style="margin:24px 0 0;color:#6b7280;font-size:12px;line-height:1.5;">
                El enlace y el código expiran en 24 horas. Si no creaste esta cuenta,
                podés ignorar este correo.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
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

export function accountVerificationSubject(): string {
  return 'Confirmá tu correo en FWD Talent'
}
