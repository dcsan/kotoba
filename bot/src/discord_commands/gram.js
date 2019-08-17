const axios = require('axios').create({ timeout: 10000 });

const config = require('../../../config');

const env = 'dev';

module.exports = {
  commandAliases: ['gram'],
  uniqueId: 'gram12345',
  cooldown: config.lexy.cooldown,
  shortDescription: 'grammar info',
  canBeChannelRestricted: false,
  async action(bot, msg, suffix, monochrome) {
    const reload = await monochrome.reload();
    // console.log('bot.state', bot);
    console.log('reload', reload);
    console.log('suffix', suffix);
    // console.log('msg', msg);
    console.log('msg.content', msg.content);
    const cname = suffix;
    const lexyConfig = config.lexy[env];
    const url = `${lexyConfig.host}/xq?g=${cname}&format=md&lang=ja`;
    const response = await axios.get(url);
    const row = response.data.rows[0];
    const { text } = row;
    console.log('response', response);
    const md = `\`\`\`markdown
    ${text}
    \`\`\``;
    console.log('md', md);
    return msg.channel.createMessage(md, null, msg);
  },
};
