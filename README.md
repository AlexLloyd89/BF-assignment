# My Application

This repository contains two branches with different setup instructions:

---

## `master` Branch

To run the application on the `master` branch:

1. Navigate to the `client` folder:

   ```bash
   cd client
   npm install
   ng serve
---
## `feat/extras` Branch

The `feat/extra`s branch includes both client and server parts with additional setup:

To run the application on the `feat/extras` branch:

1. At the root of the project, install dependencies:

   ```bash
    npm install

2. In the `client` folder, install dependencies:
   ```bash
   cd client
   npm install

3. In the `server` folder, install dependencies:
   ```bash
    cd ../server
    npm install

4. Create a `.env` file in the `server` folder with the following content:
   ```bash
    GITHUB_TOKEN=your_token

5. Create an `environment.ts` file in the `client/src` with the following content:
   ```typescript
    export const environment = {
    production: false,
    apiUrl: 'http://localhost:3000',
    apiKey: 'your_token',
    };

6. At the root level of the project, run `npm start`
