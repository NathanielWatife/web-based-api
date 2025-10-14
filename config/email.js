const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls:{
        rejectUnauthorized: false
    }
});

// verify transporter configuration
transporter.verify(function(error, success) {
    if (error){
        console.error('Email transporter error:', error);
    } else {
        console.log('Email transporter is ready to take messages')
    }
});

const sendEmail = async (options) => {
    try {
        const mailOptions = {
            from: `"YabaTech Bookstore" <${process.env.EMAIL_USER}>`,
            to: options.email,
            subject: options.subject,
            html: options.html,
        };

        console.log('Attempting to send email to:', options.email);
        console.log('Using email account:', process.env.EMAIL_USER);

        const result = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', result.messageId);
        console.log('Response:', result.response);
        
        return { success: true, messageId: result.messageId };
    } catch(error) {
        console.error('Error sending email:', error);
        console.error('Error details:', {
            code: error.code,
            command: error.command,
            message: error.message
        });
        return { success: false, error: error.message };
    }
};


module.exports = { sendEmail }; 