console.log('reloaded hello');
const version = 0.20;
const constants = require('./../common/constants.js');

module.exports = {
  commandAliases: ['hello', 'hi', '!'],
  uniqueId: 'hello',
  cooldown: 5,
  shortDescription: 'Hello World',
  canBeChannelRestricted: false,
  action(bot, msg, suffix) {
    console.log('suffix', suffix);
    // console.log('msg', msg)
    // return msg.channel.createMessage(`hello from bot! \n suffix: [${suffix}] \n version ${version}`);

    const embedFields = [
      {
        name: 'field one',
        value: 'value 1',
      },
      {
        name: 'field two',
        value: 'value two',
      },
      {
        name: 'field three',
        value: 'value three',
      },
    ];

    return msg.channel.createMessage({
      content: 'some *content* goes here.',
      embed: {
        title: 'Hello Embed',
        description: 'Description goes here',
        color: constants.EMBED_NEUTRAL_COLOR,
        fields: embedFields,
        footer: {
          text: 'footer message',
          icon_url: constants.FOOTER_ICON_URI,
        },
      },
    });
  },
};
