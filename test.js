(function() {
    function Helper(assert) {
        this.assert = assert;
    }
    Helper.prototype = {
        testTextElemCombine: function(textElem, expected) {
            palipad.textElemCombine(textElem);
            var info = textElem.value + ' -> ' + expected.value;
            this.assert.equal(textElem, expected, info);
        }
    };

    var te = function createStubTextElem(value, selectionStart, selectionEnd) {
        var elem = {
            value: value,
            selectionStart: selectionStart === undefined ? 0 : selectionStart,
            selectionEnd: selectionEnd == undefined ? 0 : selectionEnd
        };
        return elem;
    };

    QUnit.test('convert', function(assert) {
        assert.equal(palipad.convert(''), '')
        assert.equal(palipad.convert('A'), 'A')
        assert.equal(palipad.convert('AAIIUU .M.T.D.N.L ~N "N'), 'ĀĪŪ ṂṬḌṆḶ Ñ Ṅ')
        assert.equal(palipad.convert('aaiiuu .m.t.d.n.l ~n "n'), 'āīū ṃṭḍṇḷ ñ ṅ')
        assert.equal(palipad.convert('aAiIuU AaIiUu'), 'ĀĪŪ āīū')
    });
})();
