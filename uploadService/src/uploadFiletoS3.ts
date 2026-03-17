import { S3 } from "aws-sdk"
import fs from "fs"

const s3 = new S3({
    accessKeyId: process.env.AWS_KEY||"",
    secretAccessKey: process.env.AWS_SECRET||"",
   
})
export const uploadFile=(fileName:string,localFilePath:string)=>{
    const fileContent=fs.readFileSync(localFilePath)
    const response=s3.upload({
        Body:fileContent,
        Bucket:"shipstack",
        Key:fileName
    }).promise()



}