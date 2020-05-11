# Inquirer List Range

A plugin for [Inquirer](https://github.com/SBoudrias/Inquirer.js). This plugin is intended to allow selecting a subset of choices with forced contiguousness of the items. Users can select the start and end of the range, but they cannot unselect items in the middle. The primary usecase for this is when you want to select A list of items, but want to enforce that users cannot change the order, or remove things from the middle of the selection.

![Demo](/demo.png?raw=true)

# Installation

npm release is pending. For now this is the only way to install:
```
npm install chrinor2002/inquirer-list-range#master
```

# Usage

The recommended string name for this prompt is: `list-range`, however you could alias it differently if you require:

```js
inquirer.registerPrompt('list-range', require('inquirer-list-range'));

inquirer.prompt({
  type: 'list-range',
  ...
})
```

# Options

Takes `type`, `name`, `message`, `choices` [, `filter`, `validate`, `default`, `pageSize`, `highlight`] properties.

The extra options that this plugin provides are:

* **highlight**: (Boolean) if `true`, the current selected choice gets highlighted. Default: `false`.

# Example

[simple.js](/examples/simple.js?raw=true)
```js
const inquirer = require('inquirer');
inquirer.registerPrompt('list-range', require('../index'));

const steps = ['step1', 'step2', 'step3', 'step4'];
inquirer.prompt({
  type: 'list-range',
  name: 'steps',
  message: 'Steps',
  pageSize: 10,
  highlight: true,
  default: ['step3', 'step4'],
  choices: steps
}).then((answers) => {
  const { steps } = answers;
  console.log(steps);
});
```

Check [advanced.js](/examples/advanced.js?raw=true) for a more advanced example.

# License

This project is under the MIT license.
