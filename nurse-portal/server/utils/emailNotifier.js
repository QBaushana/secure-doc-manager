const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  }
});

function sendDownloadAlert(filename, downloaderEmail) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.NOTIFY_TO,
    subject: `📄 Document Access Alert`,
    text: `User (${downloaderEmail}) downloaded the document: ${filename}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('❌ Email error:', error);
    } else {
      console.log('✅ Email sent:', info.response);
    }
  });
}

module.exports = sendDownloadAlert;
