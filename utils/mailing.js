const nodemailer = require("nodemailer");
const sibApiV3Sdk = require('sib-api-v3-sdk');
const fs = require('fs');

const sendBrevoEmail = async (
  to,
  subject,
  body,
  { attachments, fromName, fromEmail, cc, bcc } = {}
) => {
  try {
    if (!to) {
      return false;
    }
    const defaultClient = sibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.MAILING_SMTP_KEY;
    const apiInstance = new sibApiV3Sdk.TransactionalEmailsApi();

    const sendSmtpEmail = {
      sender: { name: 'MySpiritualCandle', email: 'support@myspiritualcandle.fr' },
      to: [{ email: to, name: 'Recipient' }],
      subject: subject,
      htmlContent: body,
      // attachment: ,
    };
    if (attachments) {
      sendSmtpEmail.attachment = [
        {
          content: fs.readFileSync(attachments[0].path).toString('base64'),
          name: attachments[0].name,
        },
      ]
    }
    try {
      const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('Email sent successfully:', response);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
    }

  } catch (error) {
    console.log(error);
    return false;
  }
};
const sendEmail = async (
  to,
  subject,
  body,
  { attachments, fromName, fromEmail, cc, bcc } = {}
) => {
  try {
    if (!to) {
      return false;
    }
    if (
      to.constructor.name !== "String" &&
      (to.constructor.name !== "Array" || to.length === 0)
    ) {
      return false;
    }

    const transportOptions = {
      secure: true,
      auth: {
        user: process.env.MAILING_USER,
        pass: process.env.MAILING_PASSWORD,
      },
    };
    if (process.env.MAILING_SERVICE) {
      transportOptions.service = process.env.MAILING_SERVICE;
    }
    if (process.env.MAILING_HOST) {
      transportOptions.host = process.env.MAILING_HOST;
    }
    if (process.env.MAILING_PORT) {
      transportOptions.port = process.env.MAILING_PORT;
    }
    const transporter = nodemailer.createTransport(transportOptions);

    const mailOptions = {
      to: typeof to == "string" ? to : to.join(", "),
      subject,
      html: body,
      from: fromEmail
        ? fromName
          ? `${fromName} <${from}>`
          : fromEmail
        : process.env.MAILING_DEFAULT_FROM_EMAIL,
      attachments,
    };
    if (cc?.constructor.name === "Array" && cc.length > 0) {
      mailOptions.cc = cc.join(", ");
    } else if (typeof cc === "string") {
      mailOptions.cc = [cc];
    }
    if (bcc?.constructor.name === "Array" && bcc.length > 0) {
      mailOptions.bcc = bcc.join(", ");
    } else if (typeof cc === "string") {
      mailOptions.bcc = [bcc];
    }
    const info = await transporter.sendMail(mailOptions);



    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

module.exports = { sendEmail, sendBrevoEmail };
