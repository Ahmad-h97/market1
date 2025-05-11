import nodemailer from 'nodemailer';


// Generate a test account automatically

const sendVerificationEmail = async (email, code) => {

    try {
    // Use Ethereal test account for development
   
    const testAccount = await nodemailer.createTestAccount();
     const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    /*
    for real email later 

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS
      }
    });
    */

    const mailOptions = {
      from: `"Market App" <${testAccount.user}>`,
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Market App Email Verification</h2>
          <p>Your verification code is:</p>
          <h3>${code}</h3>
          <p>This code expires in 15 minutes.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

export { sendVerificationEmail };