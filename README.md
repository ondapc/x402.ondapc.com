# x402.ondapc.com
x402 Digial Payment System

Node.js Version 24.21.0

Package Manager npm  

Application Mode production

Application URL http://x402.ondapc.com

Application Root /x402.ondapc.com

Application Startup File app.js

Custom environment variables .env file

In order to get the paywall working, I had to edit the source file in 

/modules/@x402-avm/paywall/dist/esm/index.js

This custom app requires sensitive data found in the .env file. ( mySQL credentials, service point URL's ) which cannot be supplied for security reasons.
