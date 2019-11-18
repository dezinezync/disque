'use strict';

const redis = require('redis');
const slice   = Array.prototype.slice;
const {promisify} = require('util');

class Disque {
  
    constructor(config) {
        if (config instanceof Function)
            this.config = config;
        else
            this.config = function() { return config || {} };
    }

    connect() {

        let config;

        if (this.sendAsync) {
            return Promise.resolve(this.sendAsync);
        }
        else {
            return Promise.resolve(this.config())
            .then(result => {

                config = result;

                const addr  = config.nodes[0];
                const parts = addr.split(':');
                this.client = redis.createClient(parts[1], parts[0]);

                this.sendAsync = promisify(this.client.send_command).bind(this.client);

                return Promise.resolve(this.sendAsync);

            })
            .then(() => {

                if (config.auth) {
                    return this.call('auth', config.auth);
                }

                return this.sendAsync;

            });
        }

    }

    call (command, args) {

        console.debug(command, args);

        return this.connect()
        .then((sendAsync) => {
            return sendAsync(command, args);
        });
    }

    addjob(queue, job, options) {
        if (options) {
            const timeout = options.timeout || 0;
            const keys    = Object.keys(options);
            const args    = keys
                .filter(key => key !== 'timeout')
                .map(pairify(options))
                .reduce((accum, pair) => accum.concat(pair), []);

            return this.call('ADDJOB', [queue, job, timeout ].concat(args));
        }
        else
            return this.call('addjob', [queue, job, 0]);
    }

    getjob(queue, options) {
        const keys    = Object.keys(options || {});
        const args    = keys
            .map(pairify(options))
            .reduce((accum, pair) => accum.concat(pair), []);

        args.push('from', queue);

        return this.call('GETJOB', args)
        .then(function(jobs) {

            if (!jobs) {
                return []
            }

            return jobs.map(function(job) {
                return {
                    queue: job[0],
                    id:    job[1],
                    body:  job[2]
                };
            });
        });

    }

    ackjob(ids) {

        if (!(ids instanceof Array)) 
            ids = [ids];

        return this.call('ACKJOB', ...ids)

    }

    info() {
        return this.call('info')
        .then(parseInfo);
    }

    end() {
        if (this.client) {
            this.client.quit();
            this.client = null;
        }
    }
}

function parseInfo(str) {
    const result = {};

    str
    .split("\r\n")
    .forEach(function(line) {
        if (line.length === 0 || line[0] === '#') return;

        const parts = line.split(':');
        const key   = parts[0];
        const value = parts[1];

        result[key] = value;
    });

    return result;
}

function pairify(obj) {
    return function(key) {
        if (obj[key] === true)
            return [ key ];
        else
            return [ key, obj[key] ];
    };
}

module.exports = Disque;
