[![Join the chat at https://gitter.im/shockone/black-screen](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/shockone/black-screen?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

### What is it?

Black Screen is a modern terminal emulator (and, unfortunately, a shell) based on [Electron](http://electron.atom.io/) and exploiting
capabilities of contemporary interfaces in contrast to most of the terminal emulators.

![](https://dl.dropboxusercontent.com/spa/dlqheu39w0arg9q/ucvbthot.png)

### Technologies

* Electron
* TypeScript
* NodeJS
* ReactJS
* SASS

### Installation

Note: Only OS X is currently supported, but we plan to make Black Screen work on all the major platforms.

###### Download
```bash
git clone https://github.com/shockone/black-screen
```
###### Install Dependencies
```bash
cd black-screen
npm run install-all
```
###### Start
```bash
npm start
```

#### Package

To create a standalone application, run:

```bash
npm run package
```

### Test

* Install [selenium-standalone](https://github.com/vvo/selenium-standalone)
* `selenium-standalone start`
* `npm run test`

### TODO

You can find the list of items currently being worked on in this issue: [TODO](https://github.com/shockone/black-screen/issues/58)

### Contributing

See [contributing guide](https://github.com/shockone/black-screen/blob/master/CONTRIBUTING.md).

### License

The MIT License.
