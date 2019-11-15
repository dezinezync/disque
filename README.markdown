# disque.js

A simple Disque client for Node.js and io.js.

Currently under development, but it's already usable and useful.

# Usage

```javascript
var disque = require('disque.js');
var client = disque.connect(['127.0.0.1:7711', '127.0.0.1:7712']);

client.addjob('queue1', 'foo', 0, function(err, res) {
  if (err) return console.error(err);

  console.log('Added job with ID ' + res);
});

// Meanwhile in a parallel universe
client.getjob(['queue1'], function(err, jobs) {
  jobs.forEach(function(job) {
    var queue   = job[0]
      , id      = job[1]
      , payload = job[2];

    doVeryHeavyWork(payload);

    client.ackjob(id, function(err) {
      if (err) return console.error(err);

      console.log('Processed job ' + id);
    });
  });
});
```

If you need to use authentication, pass in the `auth` option:

```javascript
var client = disque.connect('127.0.0.1:7711', { auth: 'foobar' });
```

# License

MIT.

Originally forked from [djanowski/disq](https://github.com/djanowski/disq).
