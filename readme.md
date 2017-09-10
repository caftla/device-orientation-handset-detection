# Detecting Real Handsets 

In certain situation we like to change the behavior of our client-side logic depending on whether or not the user is a real handset client (consumer) or a simulator or a remote-control agent.

The idea is to use distinctive device motion and touch gesture patterns to detect real human users on handset devices.

This repo currently contains a POC for collecting device motion statistics on handsets devices.

----

Compile Client Code

```
npm run compile
```

Run Server

```
npm start

npm start -- --port 8000
```
