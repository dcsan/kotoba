var express = require('express')
var router = express.Router()
const fs = require('fs');
const sharp = require('sharp');
const log = console.log

// shoot
router.get('/shots/solid', async (req, res) => {

  // res.send('shot here')
  const output = 'output/output.png'
  const semiTransparentRedPng = await sharp({
    create: {
      width: 48,
      height: 48,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 0.5 }
    }
  })
    .png()
    .toFile(output, (err, info) => {  });

  const msg = `rendered ${output}`
  res.send(msg)

})

router.get('/shots/test/svg', async (req, res) => {
  // const svgData = Buffer.from(
  //   '<svg><rect x="0" y="0" width="200" height="200" rx="50" ry="50"/></svg>'
  // );

  // const input = './static/svg/boxen.svg'
  const input = './static/svg/font-demo.svg'
  const reader = fs.createReadStream(input);

  const output = './output/out.png'
  const writer = fs.createWriteStream(output);

  const render =
    sharp()
      .resize(500, 500)
      // .composite([{
      //   input: watermark,
      // }])
      .png()

  log('rendered to ', output)

  reader
    .pipe(render)
    .pipe(writer)

  writer.on('finish', () => {
    log('ended writer')
    // res.location(output) // redirect to rendered file
    res.sendFile(output, {root: __dirname})
  });

})

module.exports = router