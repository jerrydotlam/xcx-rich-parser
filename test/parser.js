var fs = require('fs');
var path = require('path');
var assert = require('assert');

var parser = require('..');
var output = require('./output.json');

describe('parse(strHtml)', function () {
  it('should parse html string to array[xnode]', function () {
    var data = fs.readFileSync(path.join(__dirname, './input.html'), 'utf8');
    return parser
      .parse(data)
      .then(function (result) {
        assert(JSON.stringify(result).trim() === JSON.stringify(output).trim());
      })
  });
});
