const GramLib = require('../common/gram/GramLib');

const config = require('../../../config');

module.exports = {
  commandAliases: ['g', 'gram'],
  uniqueId: 'gram',
  cooldown: config.lexy.cooldown,
  shortDescription: 'grammar info',
  canBeChannelRestricted: false,
  async action(bot, msg, suffix, monochrome) {
    console.log(`suffix: [${suffix}]`);
    console.log('msg.content', msg.content);
    const cname = suffix || 'beki';
    const gram = await GramLib.getGram(cname);
    const embed = await GramLib.makeEmbed(gram);
    console.log('embed', embed);
    return msg.channel.createMessage(embed, null, msg);
  },
};
