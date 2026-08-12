export function buildBookmarkletHref(origin: string): string {
  const script =
    "(function(){" +
    "var u=encodeURIComponent(window.location.href);" +
    "var t=encodeURIComponent(document.title||'');" +
    `window.open('${origin}/?url='+u+'&title='+t,'_blank');` +
    "})();";
  return `javascript:${script}`;
}
