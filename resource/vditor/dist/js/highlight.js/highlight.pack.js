/*
 * Vditor loads this legacy highlight.js path when code highlighting is enabled.
 * code-office keeps syntax highlighting in the editor's bundled renderer, so this
 * compatibility shim only prevents WebView 404s when Vditor probes window.hljs.
 */
(function () {
  if (window.hljs) return;

  function identity(value) {
    return { value: value == null ? '' : String(value) };
  }

  window.hljs = {
    configure: function () {},
    getLanguage: function () {
      return true;
    },
    highlight: function (_language, code) {
      return identity(code);
    },
    highlightAuto: function (code) {
      return identity(code);
    },
    highlightBlock: function () {},
    highlightElement: function () {},
  };
}());
