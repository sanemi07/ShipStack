import dotenv from 'dotenv'
dotenv.config()
import { createClient } from "redis";
import { downloadFilesS3 } from './downloadFromS3.js';

const subscriber = createClient();

async function main() {
    await subscriber.connect();

    while (true) {
        const response = await subscriber.brPop("build-queue", 0);
        const downloaded=await downloadFilesS3(`output/${response?.element}`)
        console.log(downloaded)
    }
}

main().catch(console.error);
