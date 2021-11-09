const nodemailer = require('nodemailer');

const sendEmail = async options => {
    // 1) Create a transporter
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USERNAME,
            pass: process.env.EMAIL_PASSWORD
        }
        // Activate in gmail "less secure app" option
    });

    // 2) Define the email options
    const mailOptions = {
        from: 'Parth Dhawan <pdhawan2001@gmail.com>',
        to: options.email, // options opject is what we passed above to the function,
        subject: options.subject,
        text: options.message,
        // html: 
    }

    // 3) Actually send the email
    await transporter.sendMail(mailOptions)
};

module.exports = sendEmail;