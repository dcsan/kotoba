const config = require('../../../../config');
const axios = require('axios').create({ timeout: 10000 });

const env = 'dev';

const GramLib = {

  async wrapMarkdown(text) {
    return `\`\`\`markdown\n${text}\`\`\``;
  },

  async getGram(cname) {
    console.log(`cname: [${cname}]`);
    const lexyConfig = config.lexy[env];
    const url = `${lexyConfig.host}/xq?cname=${cname}&format=json&lang=ja`;
    const response = await axios.get(url);
    console.log('data', response.data);
    const gram = response.data[0];
    console.log('response.gram', gram);
    // const md = GramLib.wrapMarkdown(gram);
    // console.log('md', md);
    return gram;
  },

  async makeEmbed(gram) {
    const description = `${gram.kanji}\n${gram.sound}\n${gram.en}`;
    const data = {
      content: description,
      embed: {
        // title: 'title',
        // description: 'more'
        url: gram.url,
        color: 1275161,
        // "timestamp": "2019-08-21T13:48:38.855Z",
        // "footer": {
        //   "icon_url": "https://cdn.discordapp.com/embed/avatars/0.png",
        //   "text": "footer text"
        // },
        // thumbnail: {
        //   url: 'https://cdn.discordapp.com/embed/avatars/0.png',
        // },
        // image: {
        //   url: 'https://cdn.discordapp.com/embed/avatars/0.png',
        // },
        // author: {
        //   name: 'author name',
        //   url: 'https://discordapp.com',
        //   icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png',
        // },
        fields: [],
      },
    };

    if (gram.examples) {
      data.embed.fields = gram.examples.map((ex) => {
        const blob = {
          name: ex.kanji,
          value: ex.en,
        };
        return blob;
      });
    }
    return data;
  },
};

module.exports = GramLib;
