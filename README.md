# MQTT Client
Cross Platform MQTT Client written in react and typescript.

# Features
- Auto Subscribe/Unsubscribe while application is running (edit the connection while running)
- Save and Play saved connections without re-typing credentials and stuff
- Parse incoming messages as JSON format where possible

# Install bundled app
The production builds for MacOS, Windows and Linux are provided in the "Releases" section [here](https://github.com/damienzonly/ts-mqc/releases)

# Requirements for development
- NodeJS v10+
- npm v6.13+ or yarn v1.21+

# Clone and install dependencies
```bash
git clone https://github.com/damienzonly/ts-mqc
cd ts-mqc
yarn install
```

# Run Development mode
```bash
yarn start
```
Then navigate to http://localhost:3000

# Build from source
You can build the electron app using
```bash
yarn electron:build
```

You can configure the command from the `package.json` file to build for specific platforms. 

Refer to the `electron-builder` documentation.


# Contributing
You are welcome to fork and make PRs.

About code preferences, please use async/await over callbacks, and create type definitions as much as possible.

All the issues and enhancements please use the "Issues" section.