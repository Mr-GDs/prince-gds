
import { watchFile, unwatchFile } from 'fs'
import chalk from 'chalk' 
import { fileURLToPath } from 'url' 

const ownervb = process.env.OWNER_NUMBER || "";

// ENV format: number,name,number,name
const ownerlist = ownervb.split(',');

global.owner = [];

for (let i = 0; i < ownerlist.length; i += 2) {
    let number = ownerlist[i]?.replace(/[^0-9]/g, ''); // clean number
    let name = (ownerlist[i + 1] || "").trim();

    if (number) {
        global.owner.push([
            number,        // ❗ only number (NO @s.whatsapp.net)
            name || "Owner",
            true
        ]);
    }
}

// default owner
const defaultOwner = [
    "923092668108",
    "Prince💚",
    true
];

global.owner.push(defaultOwner);


 /*global.owner = [
  ['923092668108', 'Prince', true],
  ['639129985130']
] */

global.mods = [''] 
global.prems = ['923092668108', '639129985130']
global.botNumber = ['']  //-- numero del bot
global.APIs = { // API Prefix
  // name: 'https://website' 
  fg_ss: 'https://fg-ss.ddns.net',
  fgmods: 'https://api.fgmods.xyz'
  //fgmods: 'https://api-fgmods.ddns.net'
}
global.APIKeys = { // APIKey Here
  // 'https://website': 'apikey'
  'https://api.fgmods.xyz': 'shen' //--- Regístrese en https://api.fgmods.xyz/
}

global.developer = 'https://wa.me/message/DCAK67ON3XVOG1' //contact
//💌------------------------------------------💌



//Sticker WM
global.wm = process.env.BOT_NAME || "Prince Bot"
global.botname = process.env.BOT_NAME || "Prince Bot"
global.princebot = '🛡️𝘗𝘙𝘐𝘕𝘊𝘌-𝘉𝘖𝘛-𝘔𝘋🛡️'
global.packname = process.env.PACK_NAME
global.author = 'Prince♥️' 


//--emojis
global.rwait = '⌛'
global.dmoji = '🤭'
global.done = '✅'
global.error = '❌' 
global.xmoji = '🔥' 

global.multiplier = 69 

let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.redBright("Update 'config.js'"))
  import(`${file}?update=${Date.now()}`)
})
