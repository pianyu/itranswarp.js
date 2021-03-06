// test article api:

var
    _ = require('lodash'),
    async = require('async'),
    should = require('should');

var remote = require('./_test');

var log = console.log;

describe('#attachment', function () {

    before(remote.setup);

    describe('#api', function () {

        it('should get empty attachment', function (done) {
            remote.get(remote.guest, '/api/attachments', null, function (r) {
                r.attachments.should.be.an.Array.and.have.length(0);
                done();
            });
        });

        it('create attachment by subscriber', function (done) {
            // create attachment:
            remote.post(remote.subscriber, '/api/attachments', {
                name: 'Test Image   ',
                description: '   blablabla\nhaha...  \n   ',
                file: remote.createReadStream('./test/res-image.jpg')
            }, function (r) {
                r.error.should.equal('permission:denied');
                r.message.should.be.ok;
                done();
            });
        });

        it('upload image by contributor', function (done) {
            // create attachment:
            remote.post(remote.contributor, '/api/attachments?url=true', {
                name: 'Test Image   ',
                description: '   blablabla\nhaha...  \n   ',
                file: remote.createReadStream('./test/res-image.jpg')
            }, function (r) {
                r.name.should.equal('Test Image');
                r.width.should.equal(1280);
                r.height.should.equal(720);
                r.size.should.equal(346158);
                should(r.url).be.ok;
                r.url.should.equal('/files/attachments/' + r.id);
                var atta_id = r.id;
                async.parallel([
                    function (callback) {
                        remote.get(remote.guest, '/api/attachments/' + atta_id, null, function (r2) {
                            r2.id.should.equal(r.id);
                            r2.name.should.equal(r.name);
                            r2.size.should.equal(r.size);
                            callback(null, 'ok');
                        });
                    },
                    function (callback) {
                        remote.get(remote.guest, '/api/attachments', null, function (r2) {
                            r2.attachments.should.be.an.Array.and.have.length(1);
                            r2.attachments[0].id.should.equal(r.id);
                            callback(null, 'ok');
                        });
                    },
                    function (callback) {
                        remote.download('/files/attachments/' + atta_id, function (content_type, content_length, content) {
                            content_type.should.equal('image/jpeg');
                            content_length.should.equal(346158);
                            callback(null, 'ok');
                        });
                    },
                    function (callback) {
                        remote.download('/files/attachments/' + atta_id + '/l', function (content_type, content_length, content) {
                            content_type.should.equal('image/jpeg');
                            callback(null, 'ok');
                        });
                    },
                    function (callback) {
                        remote.download('/files/attachments/' + atta_id + '/m', function (content_type, content_length, content) {
                            content_type.should.equal('image/jpeg');
                            callback(null, 'ok');
                        });
                    },
                    function (callback) {
                        remote.download('/files/attachments/' + atta_id + '/s', function (content_type, content_length, content) {
                            content_type.should.equal('image/jpeg');
                            callback(null, 'ok');
                        });
                    },
                ], function (err, results) {
                    should(err).not.be.ok;
                    done();
                });
            });
        });


        it('upload text file but expect image', function (done) {
            // create attachment:
            remote.post(remote.contributor, '/api/attachments?image=true', {
                name: ' Text   ',
                description: '   blablabla\nhaha...  \n   ',
                file: remote.createReadStream('./test/res-plain.txt')
            }, function (r) {
                should(r.error).be.ok;
                r.error.should.equal('parameter:invalid');
                r.data.should.equal('file');
                done();
            });
        });

        it('upload text file by contributor then delete', function (done) {
            // create attachment:
            remote.post(remote.contributor, '/api/attachments', {
                name: ' Text   ',
                description: '   blablabla\nhaha...  \n   ',
                file: remote.createReadStream('./test/res-plain.txt')
            }, function (r) {
                r.name.should.equal('Text');
                r.width.should.equal(0);
                r.height.should.equal(0);
                r.size.should.equal(25197);
                // try delete by another users:
                var tasks = _.map([remote.subscriber, remote.editor], function (user) {
                    return function (callback) {
                        remote.post(user, '/api/attachments/' + r.id + '/delete', {}, function (r2) {
                            should(r2).be.ok;
                            should(r2.error).be.ok;
                            r2.error.should.equal('permission:denied');
                            r2.message.should.be.ok;
                            callback();
                        });
                    };
                });
                async.parallel(tasks, function (err, results) {
                    should(err===null).be.ok;
                    // delete by admin:
                    remote.post(remote.admin, '/api/attachments/' + r.id + '/delete', {}, function (r3) {
                        should(r3).be.ok;
                        should(r3.error).not.be.ok;
                        should(r3.id).be.ok;
                        r3.id.should.equal(r.id);
                        done();
                    });
                });
            });
        });

    });
});
