// function createPadding(length, longestLength) {
//   return new Array((longestLength - length) + 1).join(' ');
// }

module.exports = {
  commandAliases: ['state'],
  uniqueId: 'state12345',
  cooldown: 30,
  shortDescription: 'Show some meta information about me.',
  canBeChannelRestricted: false,
  action(bot, msg) {
    console.log('bot.state', bot);
    return msg.channel.createMessage(`\`\`\`md
    # BotState
    - point 1
    - point 2
\`\`\``, null, msg);
  },
};
