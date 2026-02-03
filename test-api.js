const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/graphql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Response:', data.substring(0, 200));
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

const query = JSON.stringify({
  query: '{ __typename }'
});

req.write(query);
req.end();
