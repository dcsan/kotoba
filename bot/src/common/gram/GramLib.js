const config = require('../../../../config');
const axios = require('axios').create({ timeout: 10000 });

const env = 'dev';

const GramLib = {

  async getGram(cname) {
    console.log(`cname: [${cname}]`);
    const lexyConfig = config.lexy[env];
    const url = `${lexyConfig.host}/xq?g=${cname}&format=md&lang=ja`;
    const response = await axios.get(url);
    const row = response.data.rows[0];
    const { text } = row;
    console.log('response row', row);
    const md = `\`\`\`markdown
      ${text}
      \`\`\``;
    console.log('md', md);
    return md;
  },

};

module.exports = GramLib;
