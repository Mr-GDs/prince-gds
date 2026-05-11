let handler = async (m, { conn }) => {
  try {
    let q = m.quoted ? m.quoted : m

    let pp = await q.download()

    await conn.updateProfilePicture(conn.user.id, pp)

    m.reply('✅ Profile picture updated successfully')
  } catch (e) {
    console.log(e)
    m.reply('❌ Reply to an image')
  }
}

handler.help = ['pf']
handler.tags = ['owner']
handler.command = /^(ppf|pf)$/i
handler.rowner = true

export default handler
