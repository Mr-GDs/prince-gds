import * as latest from '@whiskeysockets/baileys'
import past from '@whiskeysockets/baileys'

const baileys = latest.proto?.WebMessageInfo ? latest : past

export default baileys
