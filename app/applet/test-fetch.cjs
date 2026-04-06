const https = require('https');

https.get('https://script.google.com/macros/s/AKfycbyXuTg8tPqXQa2jLhVzBYxUae69F9015Mrff0N4TmtUN2zYFKeb53YCgfSQU8Btcht_/exec?type=USER', (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
});
