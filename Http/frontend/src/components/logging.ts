declare var require: any;

const fs = require('fs');
const dayjs = require('dayjs');


export default function logMessage(message: string) {
    const now = dayjs();
    console.log(now + ": " + message);
    fs.writeFileSync("../main.log", now + ": " + message);
}