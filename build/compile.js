var less = require('less'),
    async = require('async'),
    utils = require('kanso-utils/utils'),
    spawn = require('child_process').spawn,
    attachments = require('kanso-utils/attachments'),
    path = require('path');


function compileLess(doc, project_path, target, callback) {
    var f = target.filename;
    /**
     * we get a rather cryptic error when trying to compile a file that
     * doesn't exist, so check early for that and report something
     * sensible
     */
    path.exists(f, function (exists) {
        if (!exists) {
            return callback(new Error('File does not exist: ' + f));
        }
        console.log('Compiling ' + utils.relpath(f, project_path));

        fs.readFile(f, 'utf-8', function (err, data) {
            if (err) {
                return callback(err);
            }
            var options = {
                silent: false,
                verbose: true,
                color: true,
                compress: target.compress,
                paths: [path.dirname(f)].concat(doc._less_paths),
                filename: f
            }
            var parser = new (less.Parser)(options);

            try {
                parser.parse(data, function (err, root) {
                    if (err) {
                        less.writeError(err, options);
                        return callback(err);
                    }
                    try {
                        callback(null, root.toCSS(options));
                    }
                    catch (e) {
                        less.writeError(e, options);
                        callback(e);
                    }
                });
            }
            catch (e) {
                // sometimes errors are synchronous
                less.writeError(e, options);
                return callback(e);
            }
        });
    });
};

module.exports = function (root, path, settings, doc, callback) {
    async.forEachLimit(doc._less_compile, 5, function (target, cb) {
        var name = target.filename.replace(/\.less$/, '.css');
        compileLess(doc, path, target, function (err, css) {
            if (err) {
                console.error('Error compiling ' + target.filename);
                return cb(err);
            }
            attachments.add(doc, name, name, css);
            cb();
        });
    },
    function (err) {
        delete doc._less_paths;
        delete doc._less_compile;
        callback(err, doc);
    });
};
