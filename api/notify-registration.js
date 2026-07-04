import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const { email, name, password, role, razonSocial } = req.body;

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: "ventas.mxskynet@gmail.com",
      pass: "civkpneitftztscu",
    },
  });

  const adminEmailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Notificación de Registro de Usuario</title>
    </head>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0;-webkit-font-smoothing: antialiased;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" max-width="600px" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
              <tr>
                <td style="background-color: #dc2626; padding: 32px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; text-transform: uppercase;">TLETL Fire Systems</h1>
                  <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">Control Central de Accesos SaaS</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 32px;">
                  <h2 style="color: #0f172a; font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">Notificación de Alta de Usuario Regional</h2>
                  <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                    Estimado Administrador,<br><br>
                    Se le notifica que se ha generado una solicitud de alta en el sistema para un nuevo miembro del equipo. A continuación, se detallan los parámetros institucionales registrados:
                  </p>
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                    <tr>
                      <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; width: 35%;">Región / Enlace:</td>
                      <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; color: #0f172a;">${razonSocial || "N/A"}</td>
                    </tr>
                    <tr>
                      <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Nombre Completo:</td>
                      <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; color: #0f172a;">${name}</td>
                    </tr>
                    <tr>
                      <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Identificador (User):</td>
                      <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; color: #0f172a; font-family: monospace;">${email}</td>
                    </tr>
                    <tr>
                      <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Contraseña Temporal:</td>
                      <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; color: #b91c1c; font-family: monospace;">${password}</td>
                    </tr>
                    <tr>
                      <td style="padding: 14px 16px; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Rango Asignado:</td>
                      <td style="padding: 14px 16px; font-size: 13px; font-weight: 600; color: #0f172a;">${role}</td>
                    </tr>
                  </table>
                  <p style="color: #334155; font-size: 13px; line-height: 1.6; margin: 0;">
                    Este registro se encuentra en la infraestructura. Las credenciales de acceso ya han sido enviadas automáticamente al correo del usuario.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const userEmailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Tus Accesos a TLETL</title>
    </head>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0;-webkit-font-smoothing: antialiased;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="100%" max-width="600px" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
              <tr>
                <td style="background-color: #dc2626; padding: 32px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; text-transform: uppercase;">TLETL Fire Systems</h1>
                  <p style="color: rgba(255,255,255,0.8); margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">Bienvenido al Sistema</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 32px;">
                  <h2 style="color: #0f172a; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">¡Hola, ${name}!</h2>
                  <p style="color: #334155; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                    Tu cuenta ha sido generada exitosamente en nuestra plataforma de monitorización. A continuación, te proporcionamos tus credenciales de acceso:
                  </p>
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                    <tr>
                      <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; width: 35%;">Usuario:</td>
                      <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: 600; color: #0f172a;">${email}</td>
                    </tr>
                    <tr>
                      <td style="padding: 14px 16px; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Contraseña:</td>
                      <td style="padding: 14px 16px; font-size: 13px; font-weight: 600; color: #b91c1c; font-family: monospace;">${password}</td>
                    </tr>
                  </table>
                  <p style="color: #334155; font-size: 13px; line-height: 1.6; margin: 0;">
                    <strong>Nota de seguridad:</strong> Te recomendamos cambiar esta contraseña temporal la primera vez que inicies sesión ingresando a la sección de tu perfil en el sistema.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const adminMailOptions = {
    from: '"Acceso TLETL" <ventas.mxskynet@gmail.com>',
    to: "ventas.mxskynet@gmail.com",
    subject: `[ALTA DE USUARIO] Registro Exitoso - ${name}`,
    html: adminEmailHtml,
  };

  const userMailOptions = {
    from: '"Soporte TLETL" <ventas.mxskynet@gmail.com>',
    to: email,
    subject: `Tus credenciales de acceso a TLETL Fire Systems`,
    html: userEmailHtml,
  };

  try {
    await Promise.all([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(userMailOptions),
    ]);

    return res
      .status(200)
      .json({
        message:
          "Notificaciones enviadas exitosamente al administrador y al usuario.",
      });
  } catch (error) {
    console.error("Error SMTP Gmail:", error);
    return res
      .status(500)
      .json({ error: "Falla en el envío de correos: " + error.message });
  }
}
