import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import fs from 'fs'

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getS3Client() {
  return new S3Client({
    region: getRequiredEnv("AWS_REGION"),
    credentials: {
      accessKeyId: getRequiredEnv("AWS_KEY"),
      secretAccessKey: getRequiredEnv("AWS_SECRET"),
    },
  });
}

export const uploadFile=async(fileName:string,localFilePath:string)=>{
        const fileStream=fs.createReadStream(localFilePath)
       const upload=new Upload({
        client:getS3Client(),
        params:{
            Body:fileStream,
            Bucket:getRequiredEnv("AWS_BUCKET"),
        Key:fileName        }

    
       })

  try {
    const result = await upload.done();
    console.log("Uploaded:", result);
    return result;
  } catch (err) {
    console.error("Upload failed:", err);
    throw err;
  }
       
    } 

