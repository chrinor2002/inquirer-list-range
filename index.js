const chalk = require('chalk');
const cliCursor = require('cli-cursor');
const figures = require('figures');
const _ = require('lodash');
const {
  filter,
  map,
  takeUntil
} = require('rxjs/operators');

const Base = require('inquirer/lib/prompts/base');
const observe = require('inquirer/lib/utils/events');
const Paginator = require('inquirer/lib/utils/paginator');

const {
  ANCHOR_START,
  ANCHOR_END
} = require('./constants');

class ListRangeSelect extends Base {
  /**
   * Constructor.
   * @param  {...any} args 
   */
  constructor(...args) {
    super(...args);

    if (!this.opt.choices) {
      this.throwParamError('choices');
    }

    this.setupCheckedChoices();
    this.setCurrentPointer(ANCHOR_START);
    this.paginator = new Paginator(this.screen);
    this.opt.default = null;
  }

  /**
   * Main run function. Use for setup of various listeners.
   * @param {function} cb 
   */
  _run(cb) {
    this.done = cb;

    const events = observe(this.rl);
    const validation = this.handleSubmitEvents(
      events.line.pipe(map(this.getCurrentValue.bind(this)))
    );
    validation.success.forEach(this.onEnd.bind(this));
    validation.error.forEach(this.onError.bind(this));

    const filterKeyBy = (k) => filter(({ key }) => key.name === k);

    const captureKey = (evt, cb) => evt.pipe(takeUntil(validation.success)).forEach(cb.bind(this));
    captureKey(events.normalizedUpKey, this.onUpKey);
    captureKey(events.normalizedDownKey, this.onDownKey);
    captureKey(events.keypress.pipe(filterKeyBy('left')), this.onLeftOrRightKey);
    captureKey(events.keypress.pipe(filterKeyBy('right')), this.onLeftOrRightKey);
    captureKey(events.aKey, this.onAKey);

    cliCursor.hide();
    this.render();
    return this;
  }

  /**
   * Setup the checked choices.
   */
  setupCheckedChoices() {
    if (!this.opt.default || !_.isArray(this.opt.default)) {
      this.opt.default = this.opt.choices.map((c) => c.value)
    }

    if (!this.opt.choices) {
      this.throwParamError('choices');
    }

    // TODO: validate this.opt.default args are a subset of the this.opt.choices
    // TODO: fill in missing gaps, when this.opt.default has non contigus "checked"

    this.checkedChoices = [];
    this.separatorOffset = 0;
    this.disabledOffset = 0;
    this.opt.choices.forEach((choice, i) => {
      const isSeperator = choice.type === 'separator';
      if (isSeperator) {
        this.separatorOffset++;
        return;
      }
      const isDisabled = Boolean(choice.disabled);
      if (isDisabled) {
        this.disabledOffset++;
        return;
      }
      const choiceIsDefaultChecked = this.opt.default.indexOf(choice.value) >= 0;
      if (choiceIsDefaultChecked) {
        const c = { choice, i, realI: i - (this.separatorOffset + this.disabledOffset) };
        c.choice.checked = true;
        this.checkedChoices.push(c);
      }
    });
    this.checkedChoices.sort((a, b) => a.i - b.i);
    this.anchorStart = this.realIndexOfChecked(_.first(this.checkedChoices));
    this.anchorEnd = this.realIndexOfChecked(_.last(this.checkedChoices));
  }

  /**
   * Filter function. Used to filter choices based on:
   *  - When choice.checked is truthy, and;
   *  - When disabled is falsy
   * @param {Choice} choice
   */
  byIsCheckedAndNotDisabled(choice) {
    const isChecked = Boolean(choice.checked);
    const isNotDisabled = !Boolean(choice.disabled);
    return isChecked && isNotDisabled;
  }

  /**
   * Gets the current "checked" values.
   */
  getCurrentValue() {
    const choices = this.opt.choices.filter(this.byIsCheckedAndNotDisabled);
    this.selection = _.map(choices, 'short');
    return _.map(choices, 'value');
  }

  /**
   * Tests to check if the selected anchor is the "start" anchor.
   */
  currentAnchorIsStart() {
    return this.currentAnchor === ANCHOR_START;
  }

  /**
   * Tests to check if the selected anchor is the "end" anchor.
   */
  currentAnchorIsEnd() {
    return this.currentAnchor === ANCHOR_END;
  }

  /**
   * Getter. Returns the choice at the current currently pointed at.
   */
  currentChoice() {
    return this.opt.choices.getChoice(this.pointer);
  }

  /**
   * Tests to check if there is a current choice.
   */
  hasCurrentChoice() {
    return !!this.currentChoice();
  }

  /**
   * Returns the number of choices that are separators or disabled from the provided choices.
   */
  unavailableOffset() {
    return this.opt.choices.length - this.opt.choices.realLength;
  }

  /**
   * Util. Returns the minimum possible pointer value.
   */
  pointerMin() {
    return 0;
  }

  /**
   * Util. Returns the maximum possible pointer value.
   */
  pointerMax() {
    return this.opt.choices.realLength - 1;
  }

  /**
   * Returns the real index id of a given CheckedChoice.
   * @param {*} checkedChoice 
   */
  realIndexOfChecked(checkedChoice) {
    return checkedChoice.realI;
  }

  /**
   * Sets the pointer to the value of the currently selected anchor.
   */
  setPointerFromCurrentAnchor() {
    const isStart = this.currentAnchorIsStart();
    if (isStart) {
      this.pointer = this.anchorStart;
    } else {
      this.pointer = this.anchorEnd;
    }
  }

  /**
   * Sets the current pointer to the provided pointer constant.
   * @param {*} pointer 
   */
  setCurrentPointer(pointer) {
    const isStart = pointer === ANCHOR_START;
    this.currentAnchor = isStart ? ANCHOR_START : ANCHOR_END;
    this.setPointerFromCurrentAnchor();
  }

  /**
   * Handler for the end actions when validation is successful.
   * @param {*} state
   */
  onEnd(state) {
    this.status = 'answered';
    this.render();

    this.screen.done();
    cliCursor.show();

    this.done(state.value);
  }

  /**
   * Handler for when an error occurs during validation.
   * @param {*} state 
   */
  onError(state) {
    this.render(state.isValid);
  }

  /**
   * Handler for the left or right key;
   */
  onLeftOrRightKey() {
    this.setCurrentPointer(this.currentAnchorIsEnd() ? ANCHOR_START : ANCHOR_END);
    this.render();
  }

  /**
   * Handler for the a key.
   */
  onAKey() {
    this.setupCheckedChoices();
    this.setPointerFromCurrentAnchor();
    this.render();
  }

  /**
   * Handler for the up key
   */
  onUpKey() {
    if (this.currentAnchorIsStart()) {
      this.moveStartUp();
    } else {
      this.moveEndUp();
    }

    this.render();
  }

  /**
   * Handler for when the start anchor is selected, and the up key is triggered.
   */
  moveStartUp() {
    const isMoreThanMin = this.pointer > this.pointerMin();
    if (!isMoreThanMin) {
      return;
    }

    // Move the pointer, then apply to the next choice
    this.pointer--;
    this.anchorStart = this.pointer;
    this.setCheckedForCurrentChoice(true);
  }

  /**
   * Handler for when the end anchor is selected, and the up key is triggered.
   */
  moveEndUp() {
    const isMoreThanMin = this.pointer > this.pointerMin();
    const firstCheckedChoice = _.first(this.checkedChoices);
    const realIndex = this.realIndexOfChecked(firstCheckedChoice);
    const willBeGreaterThanCheckedMin = this.pointer - 1 >= realIndex;
    if (!isMoreThanMin || !willBeGreaterThanCheckedMin) {
      return;
    }

    // Apply to the "prevous" choice, then move the pointer
    this.setCheckedForCurrentChoice(false);
    this.pointer--;
    this.anchorEnd = this.pointer;
  }

  /**
   * Handler for the down key.
   */
  onDownKey() {
    if (this.currentAnchorIsStart()) {
      this.moveStartDown();
    } else {
      this.moveEndDown();
    }

    this.render();
  }

  /**
   * Handler for then start anchor is selected, and the down key is triggered.
   */
  moveStartDown() {
    const isLessThanMax = this.pointer < this.pointerMax();
    const lastCheckedChoice = _.last(this.checkedChoices);
    const realIndex = this.realIndexOfChecked(lastCheckedChoice);
    const willBeLessThanCheckedMax = this.pointer + 1 <= realIndex;
    if (!isLessThanMax || !willBeLessThanCheckedMax) {
      return;
    }
    // Apply to the "prevous" choice, then move the pointer
    this.setCheckedForCurrentChoice(false);
    this.pointer++;
    this.anchorStart = this.pointer;
  }

  /**
   * Handler for when the end anchor is selected, and the down key is triggered.
   */
  moveEndDown() {
    const isLessThanMax = this.pointer < this.pointerMax();
    if (!isLessThanMax) {
      return;
    }
    // Move the pointer, then apply to the next choice
    this.pointer++;
    this.anchorEnd = this.pointer;
    this.setCheckedForCurrentChoice(true);
  }

  /**
   * Uses the currentChoice() and sets its checked state to the provided isChecked boolean.
   * @param {boolean} isChecked 
   */
  setCheckedForCurrentChoice(isChecked) {
    this.setCheckedForChoice(this.currentChoice(), isChecked);
  }

  /**
   * Sets the checked to the value of isChecked for the provided Choice.
   * @param {Choice} choice 
   * @param {boolean} isChecked 
   */
  setCheckedForChoice(choice, isChecked) {
    _.remove(this.checkedChoices, (checkedChoice) => _.isEqual(
      choice.value,
      checkedChoice.choice.value
    ));
    choice.checked = false;

    if (isChecked) {
      choice.checked = true;
      this.checkedChoices.push({
        choice,
        i: this.opt.choices.indexOf(choice),
        realI: this.pointer
      });
    }

    this.checkedChoices.sort((a, b) => a.i - b.i);
  }

  /**
   * Main render function.
   * @param {*} error 
   */
  render(error) {
    const lines = [];
    const bottomLines = [];

    if (error) {
      const errFigure = chalk.red('>>');
      bottomLines.push(`${errFigure} ${error}`);
    }

    const isAnswered = this.status === 'answered';
    if (!isAnswered) {
      lines.push(`${this.getQuestion()}${this.renderHelp()}`);
      const choicesStr = this.renderChoices();
      const indexPosition = this.opt.choices.indexOf(this.currentChoice());
      lines.push(this.paginator.paginate(choicesStr, indexPosition, this.opt.pageSize));
    } else {
      const answers = chalk.cyan(this.selection.join(', '));
      lines.push(`${this.getQuestion()}${answers}`);
    }
    const message = lines.join('\n');
    const bottomContent = bottomLines.join('\n');
    this.screen.render(message, bottomContent);
  }

  /**
   * Render the help messaging.
   */
  renderHelp() {
    const leftArrow = chalk.cyan.bold(`${figures.arrowLeft}`);
    const rightArrow = chalk.cyan.bold(`${figures.arrowRight}`);
    const upArrow = chalk.cyan.bold(`${figures.arrowUp}`);
    const downArrow = chalk.cyan.bold(`${figures.arrowDown}`);
    const a = chalk.cyan.bold('<a>');
    const helps = [
      `${leftArrow} or ${rightArrow} to change anchors`,
      `${upArrow} or ${downArrow} to move anchors`,
      `${a} to select all`,
    ].join(', ');
    return `(Press ${helps})`;
  }

  /**
   * Determines the "figure" for the various conditions that can occur for a choice.
   * @param {Number} i 
   * @param {Number} of 
   * @param {boolean} isChecked 
   */
  determineChoiceFigure(i, of, isChecked) {
    // 91 [
    let code = 91;
    if (of > 1) {
      // 9122 ⎢
      code = 9122;
      switch(i) {
        // 9121 ⎡
        case 0: code = 9121; break;
        // 9123 ⎣
        case (of - 1): code = 9123; break;
      }
    }
    return Boolean(isChecked) ? chalk.green(String.fromCharCode(code)) : ' ';
  }

  /**
   * Determines the pointer figure depending if something is "being pointed at" or not.
   * @param {boolean} isPointedAt 
   */
  determinePointerFigure(isPointedAt) {
    if (isPointedAt) {
      return chalk.cyan(figures.pointer);
    } else {
      return ' ';
    }
  }

  /**
   * Render the choices.
   */
  renderChoices() {
    let output = '';
    let separatorOffset = 0;
    this.opt.choices.forEach((choice, index) => {
      const {
        separatorOffset: newOffset,
        pointer,
        figure,
        choiceName,
        disabledMessage,
      } = this.determineChoiceDetails(choice, index, separatorOffset);
      separatorOffset = newOffset;
      output += `${pointer}${figure} ${choiceName}${disabledMessage}`;
      output += '\n';
    });
    return output.trimRight('\n');
  }

  /**
   * Determines the details to render a specific Choice.
   * @param {Choice} choice 
   * @param {Number} index 
   * @param {Number} separatorOffset 
   */
  determineChoiceDetails(choice, index, separatorOffset) {
    const isSeperator = choice.type === 'separator';
    const isDisabled = choice.disabled;

    let disabledMessage = '';
    let choiceName = choice.name;
    let figure = '';
    let pointer = '';

    if (isSeperator) {
      separatorOffset++;
      choiceName = choice;
    } else if (isDisabled) {
      separatorOffset++;
      const disabledString = _.isString(choice.disabled) ? choice.disabled : 'Disabled';
      disabledMessage = ` (${disabledString})`;
      pointer = this.determinePointerFigure(false);
      figure = '-';
    } else {
      const isPointedAt = index - separatorOffset === this.pointer;
      const checkedIndexOfCurrentChoice = _.findIndex(this.checkedChoices, (v) => v.choice.value === choice.value);
      pointer = this.determinePointerFigure(isPointedAt);
      figure = this.determineChoiceFigure(checkedIndexOfCurrentChoice, this.checkedChoices.length, choice.checked);
    }

    return {
      separatorOffset,
      pointer,
      figure,
      choiceName,
      disabledMessage
    };
  }
}

module.exports = ListRangeSelect;
