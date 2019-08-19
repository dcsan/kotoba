# notes / questions

## dev/restart loop
I created a `nodemon ..` task to restart when code changes,
but it doesn't seem to reload/pickup any changes in commands.
It seems that's deeper in monochrome...

# monochrome 'ejected'
monochrome is an NPM module. to modify that...
wondering if you have a setup to just use local monochrome code
so i don't have to modify the NPM module.
If i just dump monochrome src into eg `bot/framework/` and require it from there...
it should work i guess?

## heap dumps
I think nodemon restarting is causing some kind of heapdump.

# uniqueId
uniqueId: 'state12345',
does this have to be unique across all instances?
why can't we create internally like `bot.id + action`

# testing
since these are text in/out, very well suited for testing
wonder if you have a simple test framework somewhere?

## typescript typings
i like TS! wonder if you have typings so i could get intellisense etc.
maybe Eris does, but that's not really used here.

## how do I get at the `config` or other bot variables?
I looked at `bot.config` on the action params but doesn't seem to be there.
just require the config?
