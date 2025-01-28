// import * as nodemailer from "nodemailer";
// // import { INewAdminPassword } from "../interfaces/admin";
// import { GOOGLE_EMAIL, GOOGLE_PASS } from "../config";

// export async function newAdminPasswordEmail(newAdmin: any) {
//   const mailOptions = {
//     from: GOOGLE_EMAIL,
//     to: newAdmin.email,
//     subject: "New Admin Account",
//     html: `
//         <h1>Welcome to P2Care</h1>
//         <p>Hello ${newAdmin.name},</p>
//         <p>Your new admin account has been created successfully.</p>
//         <p>Your password is: <strong>${newAdmin.password}</strong></p>
//         <p>Use this password to login to your account.</p>
//         <p>Thank you for joining us.</p>
//         `,
//   };

//   const transporter = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//       user: GOOGLE_EMAIL,
//       pass: GOOGLE_PASS,
//     },
//   });

//   try {
//     const info = await transporter.sendMail(mailOptions);
//     console.log("Email sent:", info.response);
//   } catch (error) {
//     console.error("Email sending failed:", error);
//   }
// }

// export async function updateAdminPasswordEmail(updateAdmin: any) {
//   const mailOptions = {
//     from: GOOGLE_EMAIL,
//     to: updateAdmin.email,
//     subject: "Admin Account Password Update",
//     html: `
//         <h1>Welcome to Activity Tracking</h1>
//         <p>Hello ${updateAdmin.name},</p>
//         <p>Your admin account password has been updated successfully.</p>
//         <p>Your new password is: <strong>${updateAdmin.password}</strong></p>
//         <p>Use this password to login to your account.</p>
//         <p>Thank you for joining us.</p>
//         `,
//   };

//   const transporter = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//       user: GOOGLE_EMAIL,
//       pass: GOOGLE_PASS,
//     },
//   });

//   try {
//     const info = await transporter.sendMail(mailOptions);
//     console.log("Email sent:", info.response);
//   } catch (error) {
//     console.error("Email sending failed:", error);
//   }
// }

// export async function sendOtpEmail(email: string, otp: number) {
//   const mailOptions = {
//     from: GOOGLE_EMAIL,
//     to: email,
//     subject: "OTP Verification",
//     html: `
//         <h1>Welcome to Activity Tracking</h1>
//         <p>Hello,</p>
//         <p>Your OTP for email verification is: <strong>${otp}</strong></p>
//         <p>Use this OTP to verify your email.</p>
//         <p>Thank you for joining us.</p>
//         `,
//   };

//   const transporter = nodemailer.createTransport({
//     service: "Gmail",
//     auth: {
//       user: GOOGLE_EMAIL,
//       pass: GOOGLE_PASS,
//     },
//   });

//   try {
//     const info = await transporter.sendMail(mailOptions);
//     console.log("Email sent:", info.response);
//   } catch (error) {
//     console.error("Email sending failed:", error);
//   }
// }
