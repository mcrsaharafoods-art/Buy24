import server from '../dist/server/server.js';
import { Readable } from 'stream';

export default async function handler(req, res) {
  try {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const url = new URL(req.url, `${protocol}://${host}`);

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers.append(key, value);
      } else if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      }
    }

    const init = {
      method: req.method,
      headers,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      init.body = Buffer.concat(chunks);
    }

    const request = new Request(url.toString(), init);
    const fetchHandler = server.default ? (server.default.fetch || server.default.default?.fetch) : server.fetch;
    const response = await fetchHandler(request, process.env, {});

    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    res.statusCode = response.status;

    if (response.body) {
      if (response.body.getReader) {
        // Web ReadableStream
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } else {
        // Node stream or Buffer
        for await (const chunk of response.body) {
          res.write(chunk);
        }
        res.end();
      }
    } else {
      res.end();
    }
  } catch (error) {
    console.error('Adapter Error:', error);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
}
