;(function() {
  const script = document.createElement('script')
  const api = typeof chrome !== 'undefined' ? chrome : browser
  script.src = api.runtime.getURL('credentials-library.js')

  script.onload = function() {
    script.remove()
  }

  document.documentElement.appendChild(script)
})()
