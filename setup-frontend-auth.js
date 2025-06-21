const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2ODU2OGNiNjk2ZGJhMzBjOTcwZjc3NWUiLCJpYXQiOjE3NTA1MDI2MDAsImV4cCI6MTc1MTEwNzQwMH0.lwnHeQDAtOzeRBM33IZa6oXQwWA7SHw7Hni1EwzgR3w";
const pageAccessToken = "EAAOEXMrqZACQBO0pMxufZAWlupOF9fIJyxDNzGoJaEpYfjmuUjRhOMAehMEais9KFFKDDKP6nX3OTPnwHYpNuPPE34RayBO5WzdlJ6RZCmMP6SWeFhPpZAyZB8zIOrcLwJP82iHIe0PkCGscQOQG2F4j4ZAvmHGBq8ZChatX3ng5xLDIprcZAVEbKAZCwbXpfUD02ZClmnfOU5";

// Store in localStorage (you can run this in browser console)
localStorage.setItem('token', token);
localStorage.setItem('pageAccessToken', pageAccessToken);

console.log('Auth tokens stored!');
console.log('Now refresh the page to test the posts functionality.');
