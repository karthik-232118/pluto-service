const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for port 465, false for other ports
  auth: {
    user: process.env.SENDER_EMAIL,
    pass: process.env.SENDER_EMAIL_PASSWORD,
  },
});

const microsoftTransporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false, // Use TLS
  auth: {
    user: process.env.OFFICE365_EMAIL, // Office 365 email (e.g., your email@example.com)
    pass: process.env.OFFICE365_PASSWORD, // Office 365 password or app-specific password
  },
});

exports.mailService = async ({
  recipientEmail,
  subject,
  body,
  ccEmails = "", // Default to an empty string if not provided
  attachments = [], // Default to an empty array if not provided
}) => {
  // Prepare the mail options
  const mailOptions = {
    from: `"Zerozilla Infotech" <${process.env.SENDER_EMAIL}>`, // sender address
    to: recipientEmail, // list of receivers
    subject, // Subject line
    ...body,
  };

  // Only add the cc field if ccEmails is not an empty string
  if (ccEmails) {
    mailOptions.cc = ccEmails; // Add CC recipients only if there are any
  }

  // Only add attachments if they are provided
  if (attachments.length > 0) {
    mailOptions.attachments = attachments;
  }

  try {
    // Send mail with defined transport object
    const info = await transporter.sendMail(mailOptions);

    // Log mail information on successful send
    console.log(`Email sent successfully to ${recipientEmail}`);
    console.log(info);
  } catch (error) {
    // Log error if email sending fails
    console.error(`Failed to send email to ${recipientEmail}:`, error);
    throw error; // Re-throw the error to handle it upstream if necessary
  }
};

exports.eSignMailService = async ({
  recipientEmail,
  subject,
  body,
  ccEmails = "", // Default to an empty string if not provided
  attachments = [], // Default to an empty array if not provided
}) => {
  // Prepare the mail options
  const mailOptions = {
    from: `"Zerozilla Infotech" <${process.env.SENDER_EMAIL}>`, // sender address
    to: recipientEmail, // list of receivers
    subject, // Subject line
    ...body,
  };

  // Only add the cc field if ccEmails is not an empty string
  if (ccEmails) {
    mailOptions.cc = ccEmails; // Add CC recipients only if there are any
  }

  // Only add attachments if they are provided
  if (attachments.length > 0) {
    mailOptions.attachments = attachments;
  }

  try {
    // Send mail with defined transport object
    await transporter.sendMail(mailOptions);

    // Log mail information on successful send
    console.log(`Email sent successfully to ${recipientEmail}`);
    // console.log(info);
  } catch (error) {
    // Log error if email sending fails
    console.error(`Failed to send email to ${recipientEmail}:`, error);
    throw error; // Re-throw the error to handle it upstream if necessary
  }
};

exports.microsoftMailService = async ({
  recipientEmail = [],
  subject,
  body,
  ccEmails = "", // Default to an empty string if not provided
  attachments = [], // Default to an empty array if not provided
}) => {
  // Prepare the mail options
  const mailOptions = {
    from: `"Pluto" <${process.env.OFFICE365_EMAIL}>`, // sender address
    to: recipientEmail, // list of receivers
    subject, // Subject line
    ...body,
  };

  // Only add the cc field if ccEmails is not an empty string
  if (ccEmails) {
    mailOptions.cc = ccEmails; // Add CC recipients only if there are any
  }

  // Only add attachments if they are provided
  if (attachments.length > 0) {
    mailOptions.attachments = attachments;
  }

  try {
    // Send mail with defined transport object
    await microsoftTransporter.sendMail(mailOptions);

    // Log mail information on successful send
    console.log(`Email sent successfully to ${recipientEmail}`);
    // console.log(info);
  } catch (error) {
    // Log error if email sending fails
    console.error(`Failed to send email to ${recipientEmail}:`, error);
    throw error; // Re-throw the error to handle it upstream if necessary
  }
};
