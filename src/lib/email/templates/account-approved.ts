interface AccountApprovedData {
  nombre: string
  rol: 'egresado' | 'empresario'
  accessUrl: string
  isMagicLink: boolean
}

export function accountApprovedHtml({
  nombre,
  rol,
  accessUrl,
  isMagicLink,
}: AccountApprovedData): string {
  const isEmpresario = rol === 'empresario'

  const rolLabel = isEmpresario ? 'empresario' : 'egresado'
  const mensajeRol = isEmpresario
    ? 'Ya podés publicar proyectos y comenzar a conectar con el talento FWD.'
    : 'Ya podés explorar proyectos disponibles y postularte a oportunidades.'

  const ctaLabel = isMagicLink
    ? 'Ingresar con un click'
    : 'Ingresar a FWD Talent'
  const magicLinkNote = isMagicLink
    ? `<p style="margin:16px 0 0;color:#6b7280;font-size:12px;line-height:1.5;">
        Este enlace es de un solo uso y expira en 1 hora.<br/>
        Si ya lo usaste o venció, ingresá desde
        <a href="${accessUrl.split('/auth/')[0] ?? ''}/login" style="color:#0A6CB9;">la página de inicio de sesión</a>.
      </p>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cuenta aprobada — FWD Talent</title>
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
                Tu cuenta fue aprobada<span style="color:#FFCB05;">.</span>
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">
                Hola <strong>${nombre}</strong>,
              </p>
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
                El equipo de FWD Talent revisó tu solicitud como <strong>${rolLabel}</strong> y tu cuenta ya está activa.
              </p>
              <p style="margin:0 0 32px;color:#374151;font-size:15px;line-height:1.6;">
                ${mensajeRol}
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:50px;background-color:#0A6CB9;">
                    <a href="${accessUrl}"
                       style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:50px;">
                      ${ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>

              ${magicLinkNote}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                Si no esperabas este correo o no creaste una cuenta en FWD Talent, podés ignorarlo.
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

export function accountApprovedSubject(): string {
  return 'Tu cuenta en FWD Talent fue aprobada'
}
