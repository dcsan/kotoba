const GramLib = require('../common/gram/GramLib');

const config = require('../../../config');

module.exports = {
  commandAliases: ['g'],
  uniqueId: 'gram12345',
  cooldown: config.lexy.cooldown,
  shortDescription: 'grammar info',
  canBeChannelRestricted: false,
  async action(bot, msg, suffix, monochrome) {
    const reload = await monochrome.reload();
    console.log('reload', reload);
    console.log(`suffix: [${suffix}]`);

    console.log('msg.content', msg.content);
    const cname = suffix || 'dao';
    const md = GramLib.getGram(cname);
    return msg.channel.createMessage(md, null, msg);
  },
};
