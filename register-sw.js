//<![CDATA[
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }) // scope: '/' is crucial
      .then(function(registration) {
        console.log('PWA Service Worker: Registration successful for schemamarkupgenerator.net with scope: ', registration.scope);
      })
      .catch(function(err) {
        console.log('PWA Service Worker: Registration failed for schemamarkupgenerator.net: ', err);
      });
  });
} else {
  console.log('PWA Service Worker: Not supported in this browser for schemamarkupgenerator.net.');
}
//]]>
