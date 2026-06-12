import { fileTypeFromBuffer } from 'file-type'
import uploadFile from '../lib/uploadImage.js'

let handler = async (m, { conn }) => {
  let q = m.quoted || m
  let mime = (q.msg || q).mimetype || ''

  if (!mime) return m.reply('❌ Reply to the media you want to upload!')

  try {
    await m.react('✨')

    let buffer = await q.download()
    let url = await uploadFile(buffer)

    m.reply(url.trim())
  } catch (e) {
    console.error(e)
    m.reply('❌ Failed to upload media!')
  }
}

handler.help = ['tourl']
handler.tags = ['tools']
handler.command = /^tourl$/i
handler.limit = true

export default handler
