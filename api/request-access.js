import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { nombre, email, razonSocial, telefono } = req.body;

  // 1. Configuración SMTP de Gmail con tu contraseña integrada
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, 
    auth: {
      user: 'ventas.mxskynet@gmail.com',
      pass: 'civkpneitftztscu'
    }
  });

  // 2. Diseño del correo
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
      <table width="100%" max-width="600px" align="center" style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e4e4e7; overflow: hidden; margin: 0 auto; border-spacing: 0;">
        <tr>
          <td style="background-color: #dc2626; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">TLETL Fire Systems</h1>
            <p style="color: #fca5a5; font-size: 13px; margin: 5px 0 0 0;">Solicitud de Acceso al Sistema SaaS</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 32px 24px;">
            <h2 style="color: #18181b; font-size: 16px; margin: 0 0 16px 0;">Nueva Solicitud de Cuenta</h2>
            <p style="color: #52525b; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
              Se ha recibido una nueva solicitud para ingresar a la plataforma. Valide los datos a continuación para autorizar la creación de credenciales desde el Panel de Administración.
            </p>
            
            <table width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; border-spacing: 0;">
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: bold; color: #64748b; width: 35%;">RAZÓN SOCIAL / EMPRESA:</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: bold; color: #0f172a;">${razonSocial}</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: bold; color: #64748b;">NOMBRE COMPLETO:</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: bold; color: #0f172a;">${nombre}</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 12px; font-weight: bold; color: #64748b;">CORREO ELECTRÓNICO:</td>
                <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; font-weight: bold; color: #dc2626;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; font-size: 12px; font-weight: bold; color: #64748b;">TELÉFONO DE CONTACTO:</td>
                <td style="padding: 12px 16px; font-size: 13px; font-weight: bold; color: #0f172a;">${telefono || 'No proporcionado'}</td>
              </tr>
            </table>

            <p style="color: #52525b; font-size: 12px; line-height: 1.5; margin: 24px 0 0 0; text-align: center; background-color: #fef2f2; padding: 12px; border-radius: 6px; border: 1px solid #fee2e2;">
              Acceda a la sección <strong>Gestión de Equipo</strong> en TLETL para dar de alta este usuario y generar su contraseña inicial.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const mailOptions = {
    from: '"Soporte TLETL" <ventas.mxskynet@gmail.com>',
    to: 'ventas.mxskynet@gmail.com', 
    subject: `[SOLICITUD DE ACCESO] ${razonSocial} - ${nombre}`,
    html: emailHtml
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ success: true, message: 'Solicitud enviada' });
  } catch (error) {
    console.error('Error SMTP Gmail:', error);
    return res.status(500).json({ error: 'Error al enviar la solicitud' });
  }
}