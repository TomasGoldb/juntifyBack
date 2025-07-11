import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, // true para puerto 465
    auth: {
        user: process.env.BREVO_USER, // tu correo verificado en Brevo
        pass: process.env.BREVO_PASS  // la clave SMTP
    }
}); 