#!/usr/bin/env node

// Test how tRPC client should be configured with superjson
import { httpLink } from '@trpc/client';
import superjson from 'superjson';

console.log('Testing tRPC httpLink with superjson...\n');

// Create an httpLink with superjson transformer
const link = httpLink({
  url: 'http://localhost:3000/api/trpc',
  transformer: superjson,
});

console.log('httpLink created with superjson transformer');
console.log('');

// The issue is that httpLink needs to know how to serialize the input
// Let's check if the transformer is being used correctly

// According to tRPC docs, the transformer should be used to serialize/deserialize
// But the httpLink might not be using it correctly

console.log('Key insight: The httpLink transformer should serialize the input');
console.log('But it seems the tRPC client is not doing this correctly');
console.log('');

// The solution might be to use a custom fetch function that serializes with superjson
console.log('Possible solution: Use a custom fetch function that serializes with superjson');
console.log('');

// Example of how it should work:
const customFetch = (input, init) => {
  console.log('Custom fetch called');
  console.log('Input:', input);
  console.log('Init:', init);
  
  // The init.body should already be serialized by tRPC
  // But we need to verify this
  
  return fetch(input, init);
};

console.log('Custom fetch function created');
