async function test() {
  const res = await fetch('https://script.google.com/macros/s/AKfycbyXuTg8tPqXQa2jLhVzBYxUae69F9015Mrff0N4TmtUN2zYFKeb53YCgfSQU8Btcht_/exec?type=USER');
  console.log('Status:', res.status);
  console.log('Redirected:', res.redirected);
  console.log('URL:', res.url);
  res.headers.forEach((v, k) => console.log(k, v));
}
test();
