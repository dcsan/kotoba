const express = require('express')
const app = express()
const port = process.env.PORT || 3000
const shots = require('./shots.api')

app.get('/', (req, res) => res.send('Hello World!'))

app.use('/', shots);

app.listen(port, () => console.log(`Example app listening on port ${port}!`))

app.use('/static', express.static('static'))
app.use('/output', express.static('output'))
// app.use(express.static('public'))

// app.use(function (req, res, next) {
//   const msg = `no route for: [${req.path}]`
//   console.log('404:', msg)
//   res.status(404).send(msg)
// })

