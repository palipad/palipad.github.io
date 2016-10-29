Palipad
=======

Palipad lets you type Pali easily:

<p><textarea id="pad" autofocus class="form-control" rows="10"></textarea></p>
<script>
  $(function() {
    window.pad = new palipad.Pad('#pad');
  });
</script>

And also convert text in <a href="http://www.accesstoinsight.org/abbrev.html#velthuis">Velthuis scheme</a> to proper Pāli:

<p><textarea id="pad2" class="form-control" rows="4">
Namo tassa bhagavato arahato sammaasambuddhassaa
Buddha.m sara.na.m gacchaami
Dhamma.m sara.nam gacchaami
Sa"ngha.m sara.na.m gacchaami</textarea></p>
<script>
  $(function() {
    var $elem = $('#pad2');

    $elem.focus(function() {
      this.selectionStart = 0;
      this.selectionEnd = this.value.length;
    });

    new palipad.Pad($elem[0]);
  })
</script>


Embedding
---------

You can embed Palipad in your website easily, it works on `<input>` and `<textarea>`, for example:

```
<script src="https://palipad.github.io/palipad.js"></script>
<script src="{{ site.jquery }}"></script>
<input class="palipad">
<script>
  $(function() {
    palipad.create('.palipad');
  });
</script>
```

Palipad looks fine in [plain HTML](plain), [Bootstrap](bootstrap) and [Foundation](foundation) because it uses standard tags, so you should't need to style it at all.


Report issues
-------------

If you found any issue just report it [here](https://github.com/palipad/palipad.github.io/issues), I'll look into it when I'm free.
