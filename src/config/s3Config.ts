// import {
//   S3Client,
//   PutObjectCommand,
//   GetObjectCommand,
//   DeleteObjectCommand,
// } from "@aws-sdk/client-s3";
// import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// import fs from "fs";

// import {
//   AWS_ACCESS_KEY_ID,
//   AWS_SECRET_ACCESS_KEY,
//   AWS_REGION,
//   AWS_BUCKET_NAME,
// } from "../config";

// const s3Client = new S3Client({
//   credentials: {
//     accessKeyId: AWS_ACCESS_KEY_ID || "",
//     secretAccessKey: AWS_SECRET_ACCESS_KEY || "",
//   },
//   region: AWS_REGION || "",
// });

// const bucketName = AWS_BUCKET_NAME || "";

// async function generatePresignedUrl(key: string): Promise<string> {
//   const command = new GetObjectCommand({
//     Bucket: bucketName,
//     Key: key,
//   });

//   const url = await getSignedUrl(s3Client, command, { expiresIn: 604800 }); // 1 week expiration

//   return url;
// }

// async function uploadS3File(
//   filePath: string,
//   newFileNameKey: string
// ): Promise<string> {
//   return new Promise((resolve, reject) => {
//     const fileStream = fs.createReadStream(filePath);

//     const params = {
//       Bucket: bucketName,
//       Key: newFileNameKey,
//       Body: fileStream,
//     };

//     s3Client
//       .send(new PutObjectCommand(params))
//       .then(() => generatePresignedUrl(newFileNameKey))
//       .then((url: string) => {
//         console.log(`File uploaded successfully. URL: ${url}`);
//         resolve(url);
//       })
//       .catch((err: Error) => {
//         console.error(`Error uploading file: ${err.message}`);
//         reject(err);
//       });
//   });
// }

// async function deleteS3File(newFileNameKey: string): Promise<void> {
//   const command = new DeleteObjectCommand({
//     Bucket: bucketName,
//     Key: newFileNameKey,
//   });

//   return s3Client
//     .send(command)
//     .then(() => {
//       console.log(`File deleted successfully: ${newFileNameKey}`);
//     })
//     .catch((err: Error) => {
//       console.error(`Error deleting file: ${newFileNameKey}, ${err.message}`);
//       throw err;
//     });
// }

// export { uploadS3File, deleteS3File, generatePresignedUrl };
