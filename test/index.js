'use strict';

var Async = require('async');
var Hapi = require('hapi');
var Code = require('code');
var Lab = require('lab');
var Plugin = require('../');

var expect = Code.expect;
var lab = exports.lab = Lab.script();
var beforeEach = lab.beforeEach;
var describe = lab.describe;
var it = lab.it;

describe('registration and functionality', function () {

    var server;

    beforeEach(function (done) {

        server = new Hapi.Server();
        server.connection();

        server.route({
            method: 'get',
            path: '/queryTest',
            handler: function (request, reply) {

                return reply(request.query);
            }
        });

        server.route({
            method: 'get',
            path: '/paramsTest/{a}/{b?}',
            handler: function (request, reply) {

                return reply(request.params);
            }
        });

        server.route({
            method: 'post',
            path: '/payloadTest',
            handler: function (request, reply) {

                return reply(request.payload);
            }
        });

        return done();
    });

    var register = function (options, next) {

        server.register({
            register: Plugin,
            options: options
        }, function (err) {

            return next(err);
        });
    };

    it('registers without options', function (done) {

        register({}, function (err) {

            expect(err).to.not.exist();

            server.route({
                method: 'get',
                path: '/',
                handler: function (request, reply) {

                    return reply('');
                }
            });

            server.inject({
                method: 'get',
                url: '/'
            }, function (res) {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.equal(null);

                return done();
            });
        });
    });

    it('registers with error if invalid options', function (done) {

        register({
            some: 'value'
        }, function (err) {

            expect(err).to.exist();

            return done();
        });
    });

    it('can be disabled per route', function (done) {

        register({
            devareEmpty: true
        }, function (err) {

            expect(err).to.not.exist();

            server.route({
                method: 'get',
                path: '/disabled',
                handler: function (request, reply) {

                    return reply(request.query);
                },
                config: { plugins: { disinfect: false } }
            });

            server.route({
                method: 'post',
                path: '/disabled',
                handler: function (request, reply) {

                    return reply(request.payload);
                },
                config: { plugins: { disinfect: false } }
            });

            Async.series([
                function (doneTest) {

                    server.inject({
                        method: 'get',
                        url: '/disabled?a=&b=&c=c'
                    }, function (res)  {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.deep.equal({ a: '', b: '', c: 'c' });

                        return doneTest();
                    });
                },
                function (doneTest) {

                    server.inject({
                        method: 'post',
                        url: '/disabled',
                        payload: { a: '', b: '', c: 'c' }
                    }, function (res) {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.deep.equal({ a: '', b: '', c: 'c' });

                        return doneTest();
                    });
                }
            ], function () {

                return done();
            });
        });
    });

    it('removes empties', function (done) {

        register({
            devareEmpty: true
        }, function (err) {

            expect(err).to.not.exist();

            Async.series([
                function (doneTest) {

                    server.inject({
                        method: 'get',
                        url: '/queryTest?a=&b=&c=c'
                    }, function (res) {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.deep.equal({ c: 'c' });

                        return doneTest();
                    });
                },
                function (doneTest) {

                    server.inject({
                        method: 'post',
                        url: '/payloadTest',
                        payload: { a: '', b: '', c: 'c' }
                    }, function (res) {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.deep.equal({ c: 'c' });

                        return doneTest();
                    });
                }
            ], function () {

                return done();
            });
        });
    });

    it('removes empties on a per route config', function (done) {

        register({}, function (err) {

            expect(err).to.not.exist();

            server.route({
                method: 'get',
                path: '/queryTestPerRoute',
                handler: function(request, reply) {

                    return reply(request.query);
                },
                config: {
                    plugins: {
                        disinfect: {
                            devareEmpty: true
                        }
                    }
                }
            });

            server.route({
                method: 'post',
                path: '/payloadTestPerRoute',
                handler: function (request, reply)  {

                    return reply(request.payload);
                },
                config: {
                    plugins: {
                        disinfect: {
                            devareEmpty: true
                        }
                    }
                }
            });

            Async.series([
                function (doneTest) {

                    server.inject({
                        method: 'get',
                        url: '/queryTestPerRoute?a=&b=&c=c'
                    }, function (res) {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.deep.equal({ c: 'c' });

                        return doneTest();
                    });
                },
                function (doneTest) {

                    server.inject({
                        method: 'post',
                        url: '/payloadTestPerRoute',
                        payload: { a: '', b: '', c: 'c' }
                    }, function (res) {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.deep.equal({ c: 'c' });

                        return doneTest();
                    });
                }
            ], function () {

                return done();
            });
        });
    });

    it('removes whitespaces', function (done) {

        register({
            devareWhitespace: true
        }, function (err) {

            expect(err).to.not.exist();

            Async.series([
                function (doneTest) {

                    server.inject({
                        method: 'get',
                        url: '/queryTest?a=%20%20%20&b=%20%20%20&c=c'
                    }, function (res) {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.deep.equal({ c: 'c' });

                        return doneTest();
                    });
                },
                function (doneTest) {

                    server.inject({
                        method: 'get',
                        url: '/paramsTest/' + encodeURIComponent('      ') + '/5'
                    }, function (res) {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.deep.equal({ b: '5' });

                        return doneTest();
                    });
                },
                function (doneTest) {

                    server.inject({
                        method: 'post',
                        url: '/payloadTest',
                        payload: { a: '      ', b: '       ', c: 'c' }
                    }, function (res) {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.deep.equal({ c: 'c' });

                        return doneTest();
                    });
                }
            ], function () {

                return done();
            });
        });
    });

    it('removes whitespaces on a per route config', function (done) {

        register({}, function (err) {

            expect(err).to.not.exist();

            server.route({
                method: 'get',
                path: '/queryTestPerRoute',
                handler: function (request, reply) {

                    return reply(request.query);
                },
                config: {
                    plugins: {
                        disinfect: {
                            devareWhitespace: true
                        }
                    }
                }
            });

            server.route({
                method: 'get',
                path: '/paramsTestPerRoute/{a}/{b?}',
                handler: function (request, reply) {

                    return reply(request.params);
                },
                config: {
                    plugins: {
                        disinfect: {
                            devareWhitespace: true
                        }
                    }
                }
            });

            server.route({
                method: 'post',
                path: '/payloadTestPerRoute',
                handler: function (request, reply) {

                    return reply(request.payload);
                },
                config: {
                    plugins: {
                        disinfect: {
                            devareWhitespace: true
                        }
                    }
                }
            });

            Async.series([
                function (doneTest) {

                    server.inject({
                        method: 'get',
                        url: '/queryTestPerRoute?a=%20%20%20&b=%20%20%20&c=c'
                    }, function (res) {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.deep.equal({ c: 'c' });

                        return doneTest();
                    });
                },
                function (doneTest) {

                    server.inject({
                        method: 'get',
                        url: '/paramsTestPerRoute/' + encodeURIComponent('      ') + '/c'
                    }, function (res) {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.deep.equal({ b: 'c' });

                        return doneTest();
                    });
                },
                function (doneTest) {

                    server.inject({
                        method: 'post',
                        url: '/payloadTestPerRoute',
                        payload: { a: '      ', b: '       ', c: 'c' }
                    }, function (res) {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.deep.equal({ c: 'c' });

                        return doneTest();
                    });
                }
            ], function () {

                return done();
            });
        });
    });

    it('sanitizes query', function (done) {

        register({
            disinfectQuery: true
        }, function (err) {

            expect(err).to.not.exist();

            server.inject({
                method: 'get',
                url: '/queryTest?a=' + encodeURIComponent('<b>hello <i>world</i><script src=foo.js></script></b>')
            }, function (res) {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.deep.equal({ a: '<b>hello <i>world</i></b>' });

                return done();
            });
        });
    });

    it('sanitizes query on a per route config', function (done) {

        register({}, function (err) {

            expect(err).to.not.exist();

            server.route({
                method: 'get',
                path: '/queryTestPerRoute',
                handler: function (request, reply) {

                    return reply(request.query);
                },
                config: {
                    plugins: {
                        disinfect: {
                            disinfectQuery: true
                        }
                    }
                }
            });

            server.inject({
                method: 'get',
                url: '/queryTestPerRoute?a=' + encodeURIComponent('<b>hello <i>world</i><script src=foo.js></script></b>')
            }, function (res) {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.deep.equal({ a: '<b>hello <i>world</i></b>' });

                return done();
            });
        });
    });

    it('sanitizes params', function (done) {

        register({
            disinfectParams: true
        }, function (err) {

            expect(err).to.not.exist();

            server.inject({
                method: 'get',
                url: '/paramsTest/' + encodeURIComponent('<b>hello <i>world</i><script src=foo.js></script></b>')
            }, function (res) {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.deep.equal({ a: '<b>hello <i>world</i></b>' });

                return done();
            });
        });
    });

    it('sanitizes params on a per route config', function (done) {

        register({}, function (err) {

            expect(err).to.not.exist();

            server.route({
                method: 'get',
                path: '/paramsTestPerRoute/{a}/{b?}',
                handler: function (request, reply) {

                    return reply(request.params);
                },
                config: {
                    plugins: {
                        disinfect: {
                            disinfectParams: true
                        }
                    }
                }
            });

            server.inject({
                method: 'get',
                url: '/paramsTestPerRoute/' + encodeURIComponent('<b>hello <i>world</i><script src=foo.js></script></b>')
            }, function (res) {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.deep.equal({ a: '<b>hello <i>world</i></b>' });

                return done();
            });
        });
    });

    it('sanitizes payload', function (done) {

        register({
            disinfectPayload: true
        }, function (err) {

            expect(err).to.not.exist();

            server.inject({
                method: 'post',
                url: '/payloadTest',
                payload: { a: '<b>hello <i>world</i><script src=foo.js></script></b>' }
            }, function (res) {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.deep.equal({ a: '<b>hello <i>world</i></b>' });

                return done();
            });
        });
    });

    it('sanitizes payload on a per route config', function (done) {

        register({}, function (err) {

            expect(err).to.not.exist();

            server.route({
                method: 'post',
                path: '/payloadTestPerRoute',
                handler: function (request, reply) {

                    return reply(request.payload);
                },
                config: {
                    plugins: {
                        disinfect: {
                            disinfectPayload: true
                        }
                    }
                }
            });

            server.inject({
                method: 'post',
                url: '/payloadTestPerRoute',
                payload: { a: '<b>hello <i>world</i><script src=foo.js></script></b>' }
            }, function (res) {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.deep.equal({ a: '<b>hello <i>world</i></b>' });

                return done();
            });
        });
    });

    it('accepts custom generic sanitizer', function (done) {

        register({
            genericSanitizer: function (obj) {

                var keys = Object.keys(obj);

                for (var i = 0; i < keys.length; ++i) {
                    obj[keys[i]] = obj[keys[i]] + 'x';
                }

                return obj;
            }
        }, function (err) {

            expect(err).to.not.exist();

            Async.series([
                function (doneTest) {

                    server.inject({
                        method: 'get',
                        url: '/queryTest?a=a&b=b&c=c'
                    }, function (res) {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.deep.equal({ a: 'ax', b: 'bx', c: 'cx' });

                        return doneTest();
                    });
                },
                function (doneTest) {

                    server.inject({
                        method: 'get',
                        url: '/paramsTest/a/b'
                    }, function (res) {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.deep.equal({ a: 'ax', b: 'bx' });

                        return doneTest();
                    });
                },
                function (doneTest) {

                    server.inject({
                        method: 'post',
                        url: '/payloadTest',
                        payload: { a: 'a', b: 'b', c: 'c' }
                    }, function (res) {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.deep.equal({ a: 'ax', b: 'bx', c: 'cx' });

                        return doneTest();
                    });
                }
            ], function () {

                return done();
            });
        });
    });

    it('accepts generic sanitizer on a per route config', function (done) {

        register({}, function (err) {

            expect(err).to.not.exist();

            server.route({
                method: 'get',
                path: '/queryTestPerRoute',
                handler: function (request, reply) {

                    return reply(request.query);
                },
                config: {
                    plugins: {
                        disinfect: {
                            genericSanitizer: function (obj) {

                                var keys = Object.keys(obj);

                                for (var i = 0; i < keys.length; ++i) {
                                    obj[keys[i]] = obj[keys[i]] + '1';
                                }

                                return obj;
                            }
                        }
                    }
                }
            });

            server.route({
                method: 'get',
                path: '/paramsTestPerRoute/{a}/{b?}',
                handler: function (request, reply) {

                    return reply(request.params);
                },
                config: {
                    plugins: {
                        disinfect: {
                            genericSanitizer: function (obj) {

                                var keys = Object.keys(obj);

                                for (var i = 0; i < keys.length; ++i) {
                                    obj[keys[i]] = obj[keys[i]] + '2';
                                }

                                return obj;
                            }
                        }
                    }
                }
            });

            server.route({
                method: 'post',
                path: '/payloadTestPerRoute',
                handler: function (request, reply) {

                    return reply(request.payload);
                },
                config: {
                    plugins: {
                        disinfect: {
                            genericSanitizer: function (obj) {

                                var keys = Object.keys(obj);

                                for (var i = 0; i < keys.length; ++i) {
                                    obj[keys[i]] = obj[keys[i]] + '3';
                                }

                                return obj;
                            }
                        }
                    }
                }
            });

            Async.series([
                function (doneTest) {

                    server.inject({
                        method: 'get',
                        url: '/queryTestPerRoute?a=a&b=b&c=c'
                    }, function (res) {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.deep.equal({ a: 'a1', b: 'b1', c: 'c1' });

                        return doneTest();
                    });
                },
                function (doneTest) {

                    server.inject({
                        method: 'get',
                        url: '/paramsTestPerRoute/a/b'
                    }, function (res) {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.deep.equal({ a: 'a2', b: 'b2' });

                        return doneTest();
                    });
                },
                function (doneTest) {

                    server.inject({
                        method: 'post',
                        url: '/payloadTestPerRoute',
                        payload: { a: 'a', b: 'b', c: 'c' }
                    }, function (res) {

                        expect(res.statusCode).to.be.equal(200);
                        expect(res.result).to.deep.equal({ a: 'a3', b: 'b3', c: 'c3' });

                        return doneTest();
                    });
                }
            ], function () {

                return done();
            });
        });
    });

    it('accepts query sanitizer', function (done) {

        register({
            querySanitizer: function (obj) {

                var keys = Object.keys(obj);

                for (var i = 0; i < keys.length; ++i) {
                    obj[keys[i]] = obj[keys[i]] + 'q';
                }

                return obj;
            }
        }, function (err) {

            expect(err).to.not.exist();

            server.inject({
                method: 'get',
                url: '/queryTest?a=a&b=b&c=c'
            }, function (res) {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.deep.equal({ a: 'aq', b: 'bq', c: 'cq' });

                return done();
            });
        });
    });

    it('accepts query sanitizer on a per route config', function (done) {

        register({}, function (err) {

            expect(err).to.not.exist();

            server.route({
                method: 'get',
                path: '/queryTestPerRoute',
                handler: function (request, reply) {

                    return reply(request.query);
                },
                config: {
                    plugins: {
                        disinfect: {
                            querySanitizer: function (obj) {

                                var keys = Object.keys(obj);

                                for (var i = 0; i < keys.length; ++i) {
                                    obj[keys[i]] = obj[keys[i]] + 'q1';
                                }

                                return obj;
                            }
                        }
                    }
                }
            });

            server.inject({
                method: 'get',
                url: '/queryTestPerRoute?a=a&b=b&c=c'
            }, function (res) {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.deep.equal({ a: 'aq1', b: 'bq1', c: 'cq1' });

                return done();
            });
        });
    });

    it('accepts params sanitizer', function (done) {

        register({
            paramsSanitizer: function (obj) {

                var keys = Object.keys(obj);

                for (var i = 0; i < keys.length; ++i) {
                    obj[keys[i]] = obj[keys[i]] + 'm';
                }

                return obj;
            }
        }, function (err) {

            expect(err).to.not.exist();

            server.inject({
                method: 'get',
                url: '/paramsTest/a/b'
            }, function (res) {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.deep.equal({ a: 'am', b: 'bm' });

                return done();
            });
        });
    });

    it('accepts params sanitizer on a per route config', function (done) {

        register({
            paramsSanitizer: function (obj) {

                return obj;
            }
        }, function (err) {

            expect(err).to.not.exist();

            server.route({
                method: 'get',
                path: '/paramsTestPerRoute/{a}/{b?}',
                handler: function (request, reply) {

                    return reply(request.params);
                },
                config: {
                    plugins: {
                        disinfect: {
                            paramsSanitizer: function (obj) {

                                var keys = Object.keys(obj);

                                for (var i = 0; i < keys.length; ++i) {
                                    obj[keys[i]] = obj[keys[i]] + 'm1';
                                }

                                return obj;
                            }
                        }
                    }
                }
            });

            server.inject({
                method: 'get',
                url: '/paramsTestPerRoute/a/b'
            }, function (res) {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.deep.equal({ a: 'am1', b: 'bm1' });

                return done();
            });
        });
    });

    it('accepts payload sanitizer', function (done) {

        register({
            payloadSanitizer: function (obj) {

                var keys = Object.keys(obj);

                for (var i = 0; i < keys.length; ++i) {
                    obj[keys[i]] = obj[keys[i]] + 'p';
                }

                return obj;
            }
        }, function (err) {

            expect(err).to.not.exist();

            server.inject({
                method: 'post',
                url: '/payloadTest',
                payload: { a: 'a', b: 'b', c: 'c' }
            }, function (res) {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.deep.equal({ a: 'ap', b: 'bp', c: 'cp' });

                return done();
            });
        });
    });

    it('accepts payload sanitizer a per route config', function (done) {

        register({}, function (err) {

            expect(err).to.not.exist();

            server.route({
                method: 'post',
                path: '/payloadTestPerRoute',
                handler: function (request, reply) {

                    return reply(request.payload);
                },
                config: {
                    plugins: {
                        disinfect: {
                            payloadSanitizer: function (obj) {

                                var keys = Object.keys(obj);

                                for (var i = 0; i < keys.length; ++i) {
                                    obj[keys[i]] = obj[keys[i]] + 'p1';
                                }

                                return obj;
                            }
                        }
                    }
                }
            });

            server.inject({
                method: 'post',
                url: '/payloadTestPerRoute',
                payload: { a: 'a', b: 'b', c: 'c' }
            }, function (res) {

                expect(res.statusCode).to.be.equal(200);
                expect(res.result).to.deep.equal({ a: 'ap1', b: 'bp1', c: 'cp1' });

                return done();
            });
        });
    });
});
