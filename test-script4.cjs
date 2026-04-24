const https = require('https');

https.get('https://script.google.com/macros/s/AKfycbxe24vxt6pqwXVFoEb8naw36Dn-K-_fCks2A3bD77lWiP0ExKYqyDb48FrUtWacXdsU/exec?type=MAIL', (res) => {
  console.log('Status code:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Data:', data.substring(0, 500)));
}).on('error', err => console.error(err));
