export function urlToFilename(url: string): string {
  // Escape special characters for pattern matching
  const specialCharacters = [
    '\\?',
    '\\/',
    '\\:',
    '\\@',
    '\\#',
    '\\[',
    '\\]',
    '\\!',
    '\\$',
    '\\&',
    "\\'",
    '\\(',
    '\\)',
    '\\*',
    '\\+',
    '\\,',
    '\\;',
    '\\=',
  ]
  const escapedSpecialChars = specialCharacters.join('|')

  // Create the regular expression pattern
  const regexPattern = new RegExp(escapedSpecialChars, 'g')

  // Replace special characters with underscore
  const modifiedUrl = url.replace(regexPattern, '_')
  return modifiedUrl
}
