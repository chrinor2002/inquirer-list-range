/**
 * List Range Example
 * 
 * @author Chris Reid <chrinor2002@gmail.com>
 */

const inquirer = require('inquirer');

inquirer.registerPrompt('list-range', require('./index'));

const cookingSteps = [
  new inquirer.Separator('Preperation!'),
  { name: 'Gather ingredients', value: 'gather', disabled: false },
  { name: 'Deal with squeeky door ', value: 'sqeeky-door', disabled: true },
  new inquirer.Separator('Not as fun..'),
  { name: 'Purchase fish', value: 'fish', disabled: 'Not needed for this meal.' },
  { name: 'Preheat oven', value: 'pre-heat', disabled: false },
  { name: 'Grill the steak', value: {name: 'steak', from: 'butcher joe'}, disabled: false },
  'Serve'
];

inquirer.prompt([{
  type: 'list-range',
  name: 'cookingStepsToRun',
  message: 'Steps for cooking',
  choices: cookingSteps,
  pageSize: 10,
  default: ['Serve'],
  validate: (answer) => {
    if (answer.length == 1) {
      return 'You must choose at least two steps.';
    }
    return true;
  }
}]).then((answers) => {
  const { cookingStepsToRun } = answers;
  console.log('Steps to cook', cookingStepsToRun);
});
