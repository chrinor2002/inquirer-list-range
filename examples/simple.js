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
