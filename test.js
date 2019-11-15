'use strict';

const tape = require('tape')
const _test = require('tape-promise').default // <---- notice 'default'
const test = _test(tape) // decorate tape

const Disq   = require('./index');

const NODES   = [ '192.168.1.110:7711' ];
const CYCLE   = 5;
const OPTIONS = { cycle: CYCLE };

const disque  = new Disq({ nodes: NODES });

test('ping', function(t) {
  return disque.call('ping')
    .then(function(reply) {
      t.equal(reply, 'PONG');
    });
});

test('info', function(t) {
  return disque.info()
    .then(function(reply) {
      t.equal(reply.loading, '0');
    });
});

test('unknown command', function(t) {
  return disque.call('foo')
    .then(t.fail)
    .catch(function(error) {
      t.assert(error, 'throws');
    });
});

test('addjob', function(t) {
  return disque.addjob('q1', 'j1')
    .then(function(reply) {
      t.assert(reply.startsWith('D-'));
    });
});

test('getjob', function(t) {
  return disque.addjob('q1', 'j1')
    .then(function() {
      return disque.getjob([ 'q1' ]);
    })
    .then(function(jobs) {
      t.equal(jobs.length, 1);
      t.equal(jobs[0].queue, 'q1');
      t.assert(jobs[0].id.startsWith('D-'));
      t.equal(jobs[0].body, 'j1');
    });
});

test('reconfigure with Promise', function(t) {
  let times = 0;

  const disque = new Disq(function() {
    const port = 7711 + times;
    times++;
    return Promise.resolve({ nodes: [ `127.0.0.1:${port}` ] });
  });

  return disque.info()
    .then(function(info) {
      t.equal(info.tcp_port, '7711');
      disque.end();
      return disque.info();
    })
    .then(function(info) {
      t.equal(info.tcp_port, '7712');
      disque.end();
    });
});

test.onFinish(function() {
  disque.end();
});