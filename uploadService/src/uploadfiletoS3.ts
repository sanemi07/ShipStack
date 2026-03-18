import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import fs from 'fs'

export const uploadFile=async(fileName:string,localFilePath:string)=>{
    const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_KEY!,
    secretAccessKey: process.env.AWS_SECRET!,
  },
});
    
        const fileStream=fs.createReadStream(localFilePath)
       const upload=new Upload({
        client:s3Client,
        params:{
            Body:fileStream,
            Bucket:process.env.AWS_BUCKET!,
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

