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
  it('should parse a 1000 deptch dom tree', function () {
    var data = fs.readFileSync(path.join(__dirname, './1000-div.html'), 'utf8');
    return parser
      .parse(data)
      .then(function (result) {
        let i = 0;
        do {
          assert(result.length === 1)
          result = result[0].children;
          i += 1;
        } while (result && result.length > 0);
        assert(i === 1001);
      });
  });
  it('should parse a 10000 depth dom tree', function () {
    var data = fs.readFileSync(path.join(__dirname, './10000-div.html'), 'utf8');
    return parser
      .parse(data)
      .then(function (result) {
        let i = 0;
        do {
          assert(result.length === 1)
          result = result[0].children;
          i += 1;
        } while (result && result.length > 0);
        assert(i === 10001);
      });
  });
});
