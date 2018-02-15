'use strict'
const reload = require('require-reload')(require);
const state = require('./../static_state.js');
const assert = require('assert');
const logger = reload('monochrome-bot').logger;

// TODO: These should be configurable
const BOT_TURN_WAIT_MIN_IN_MS = 6000;
const BOT_TURN_WAIT_MAX_IN_MS = 9000;
const ANSWER_TIME_LIMIT_IN_MS = 40000;
const INITIAL_DELAY_IN_MS = 5000;
const SPACING_DELAY_IN_MS = 1000;
const WAIT_AFTER_TIMEOUT_IN_MS = 4000;

const LOGGER_TITLE = 'SHIRITORI';
const END_STATUS_ERROR = 1;

const EndGameReason = {
  NO_PLAYERS: 1,
  STOP_COMMAND: 2,
  ERROR: 3,
};

/* LOADING AND INITIALIZATION */

if (!state.shiritoriManager) {
  state.shiritoriManager = {
    currentActionForLocationId: {},
    sessionForLocationId: {},
  };
}

function isSessionInProgressAtLocation(locationId) {
  return !!state.shiritoriManager.sessionForLocationId[locationId];
}

function setSessionForLocationId(session, locationId) {
  assert(!isSessionInProgressAtLocation(locationId), 'Already have a session for that loction ID');
  state.shiritoriManager.sessionForLocationId[locationId] = session;
}

function createTimeoutPromise(session, inMs) {
  return new Promise((fulfill, reject) => {
    let timer = setTimeout(() => {
      fulfill();
    }, inMs);
    session.addTimer(timer);
  });
}

/* ACTIONS */

class Action {
  constructor(session) {
    this.session_ = session;
  }

  getSession_() {
    return this.session_;
  }

  getGameStrategy_() {
    return this.session_.getGameStrategy();
  }
}

function endGame(locationId, reason, arg) {
  let session = state.shiritoriManager.sessionForLocationId[locationId];
  delete state.shiritoriManager.sessionForLocationId[locationId];
  let currentAction = state.shiritoriManager.currentActionForLocationId[locationId];
  delete state.shiritoriManager.currentActionForLocationId[locationId];

  if (currentAction && currentAction.stop) {
    currentAction.stop();
  }

  if (session) {
    session.clearTimers();
    return session.getClientDelegate().stopped(reason, session.getWordHistory(), arg);
  }
}

function botLeaveCommand(locationId, userId) {
  let session = state.shiritoriManager.sessionForLocationId[locationId];
  if (!session) {
    return false;
  }

  let clientDelegate = session.getClientDelegate();
  let removed = session.removeBot();
  if (removed) {
    return clientDelegate.botLeft(userId);
  }
  return false;
}

function joinCommand(locationId, userId, userName) {
  let session = state.shiritoriManager.sessionForLocationId[locationId];
  if (!session) {
    return false;
  }

  let addedOrReactivated = session.addPlayer(userId, userName);
  if (addedOrReactivated) {
    return session.getClientDelegate().addedPlayer(userId);
  }
  return false;
}

class EndGameForErrorAction extends Action {
  do() {
    return endGame(this.getSession_().getLocationId(), EndGameReason.ERROR);
  }
}

class EndGameForNoPlayersAction extends Action {
  do() {
    let session = this.getSession_();
    let players = session.getActivePlayers();
    let botIsPlaying = players.indexOf(session.getBotUserId()) !== -1;
    return endGame(this.getSession_().getLocationId(), EndGameReason.NO_PLAYERS, {players, botIsPlaying});
  }
}

class TimeoutAction extends Action {
  constructor(session, boot) {
    super(session);
    this.boot_ = boot;
  }

  do() {
    let session = this.getSession_();
    let clientDelegate = session.getClientDelegate();
    let currentPlayerId = session.getNextPlayerId();
    let promise;

    if (this.boot_) {
      promise = clientDelegate.removedPlayer(currentPlayerId);
    } else {
      promise = clientDelegate.skippedPlayer(currentPlayerId);
    }

    return promise.catch(err => {
      logger.logFailure(LOGGER_TITLE, 'Client delegate fail', err);
    }).then(() => {
      return createTimeoutPromise(session, WAIT_AFTER_TIMEOUT_IN_MS);
    }).then(() => {
      if (this.boot_) {
        session.markCurrentPlayerInactive();
      }
      if (!session.hasMultiplePlayers()) {
        return new EndGameForNoPlayersAction(session);
      }
      session.advanceCurrentPlayer();
      let nextPlayerId = session.getNextPlayerId();
      let nextPlayerIsBot = nextPlayerId === session.getBotUserId();
      let wordHistory = session.getWordHistory();
      let previousPlayerIsBot = wordHistory[wordHistory.length - 1].userId === session.getBotUserId();
      return clientDelegate.playerTookTurn(wordHistory, nextPlayerId, previousPlayerIsBot, nextPlayerIsBot).catch(err => {
        logger.logFailure(LOGGER_TITLE, 'Client delegate fail');
      }).then(() => {
        return new WaitAction(session, WAIT_AFTER_TIMEOUT_IN_MS, new TakeTurnForCurrentPlayerAction(session));
      });
    });
  }
}

class PlayerTurnAction extends Action {
  do() {
    this.playerDidTalk_ = false;
    return new Promise((fulfill, reject) => {
      this.fulfill_ = fulfill;
      return createTimeoutPromise(this.getSession_(), ANSWER_TIME_LIMIT_IN_MS).then(() => {
        let session = this.getSession_();
        let boot = !this.playerDidTalk_;
        this.fulfill_(new TimeoutAction(session, boot));
      });
    });
  }

  tryAcceptUserInput(userId, input) {
    let session = this.getSession_();
    let currentPlayerId = session.getNextPlayerId();
    if (userId !== currentPlayerId) {
      return false;
    }
    this.playerDidTalk_ = true;
    if (input.indexOf(' ') !== -1) {
      return false;
    }
    let gameStrategy = this.getGameStrategy_();
    let clientDelegate = session.getClientDelegate();
    let wordHistory = session.getWordHistory();
    let result = gameStrategy.tryAcceptAnswer(input, wordHistory);
    if (result.accepted) {
      result.word.userId = userId;
      result.word.userName = session.getNameForUserId(userId);
      if (!session.hasMultiplePlayers()) {
        this.fulfill_(new EndGameForNoPlayersAction(session));
        return true;
      }
      session.advanceCurrentPlayer();
      wordHistory.push(result.word);
      let nextPlayerId = session.getNextPlayerId();
      let nextPlayerIsBot = nextPlayerId === session.getBotUserId();
      return createTimeoutPromise(session, SPACING_DELAY_IN_MS).then(() => {
        return clientDelegate.playerTookTurn(wordHistory, nextPlayerId, false, nextPlayerIsBot);
      }).catch(err => {
        logger.logFailure(LOGGER_TITLE, 'Client delegate failed', err);
      }).then(() => {
        this.fulfill_(new TakeTurnForCurrentPlayerAction(session));
      });
    } else if (!result.isSilent) {
      let rejectionReason = result.rejectionReason;
      return clientDelegate.answerRejected(input, rejectionReason).then(() => {
        return 'Rule violation';
      });
    }

    return 'Rule violation';
  }

  stop() {
    if (this.fulfill_) {
      this.fulfill_();
    }
  }
}

class BotTurnAction extends Action {
  constructor(session, doDelay) {
    super(session);
    if (doDelay) {
      this.delay_ = BOT_TURN_WAIT_MIN_IN_MS + Math.floor(Math.random() * (BOT_TURN_WAIT_MAX_IN_MS - BOT_TURN_WAIT_MAX_IN_MS));
    } else {
      this.delay_ = 0;
    }
  }

  do() {
    let session = this.getSession_();
    let gameStrategy = this.getGameStrategy_();
    let wordHistory = session.getWordHistory();
    let clientDelegate = session.getClientDelegate();
    let nextWord = gameStrategy.getViableNextWord(wordHistory);
    nextWord.userId = session.getBotUserId();

    return Promise.resolve(clientDelegate.botWillTakeTurnIn(this.delay_)).catch(err => {
      logger.logFailure(LOGGER_TITLE, 'Client delegate failed', err);
    }).then(() => {
      return createTimeoutPromise(session, this.delay_);
    }).then(() => {
      if (!session.hasMultiplePlayers()) {
        return new EndGameForNoPlayersAction(session);
      }
      session.advanceCurrentPlayer();
      wordHistory.push(nextWord);
      let nextPlayerId = session.getNextPlayerId();
      return clientDelegate.playerTookTurn(wordHistory, nextPlayerId, true, false).catch(err => {
        logger.logFailure(LOGGER_TITLE, 'Client delegate failed', err);
      }).then(() => {
        return new TakeTurnForCurrentPlayerAction(session);
      })
    });
  }
}

class TakeTurnForCurrentPlayerAction extends Action {
  do() {
    let session = this.getSession_();
    let currentPlayerId = session.getNextPlayerId();
    if (currentPlayerId === session.getBotUserId()) {
      return new BotTurnAction(session, true);
    } else {
      return new PlayerTurnAction(session);
    }
  }
}

class StartAction extends Action {
  do() {
    const session = this.getSession_();
    return Promise.resolve(session.getClientDelegate().notifyStarting(INITIAL_DELAY_IN_MS)).catch(err => {
      logger.logFailure(LOGGER_TITLE, 'Error showing starting message', err);
    }).then(() => {
      let askQuestionAction = new BotTurnAction(session, false);
      return new WaitAction(session, INITIAL_DELAY_IN_MS, askQuestionAction);
    });
  }
}

class WaitAction extends Action {
  constructor(session, waitInterval, nextAction) {
    super(session);
    this.waitInterval_ = waitInterval;
    this.nextAction_ = nextAction;
  }

  do() {
    return createTimeoutPromise(this.getSession_(), this.waitInterval_).then(() => {
      return this.nextAction_;
    });
  }

  stop() {
    if (this.fulfill_) {
      this.fulfill_();
    }
  }
}

function chainActions(locationId, action) {
  let session = state.shiritoriManager.sessionForLocationId[locationId];
  if (!action || !action.do || !session) {
    return Promise.resolve();
  }
  state.shiritoriManager.currentActionForLocationId[locationId] = action;

  try {
    return Promise.resolve(action.do()).then(result => {
      session.clearTimers();
      return chainActions(locationId, result);
    }).catch(err => {
      logger.logFailure(LOGGER_TITLE, 'Error', err);
      return chainActions(locationId, new EndGameForErrorAction(session)).then(() => {
        return END_STATUS_ERROR;
      });
    });
  } catch (err) {
    logger.logFailure(LOGGER_TITLE, 'Error in chainActions. Closing the session.', err);
    return Promise.resolve(endGame(locationId, EndGameReason.ERROR)).then(() => {
      return END_STATUS_ERROR;
    });
  }
}

/* EXPORT */

function verifySessionNotInProgress(locationId) {
  assert(!isSessionInProgressAtLocation(locationId), 'Already a session in progress there.');
}

class ShiritoriManager {
  startSession(session) {
    let locationId = session.getLocationId();
    verifySessionNotInProgress(locationId);
    setSessionForLocationId(session, locationId);
    return chainActions(session.getLocationId(), new StartAction(session));
  }

  isSessionInProgressAtLocation(locationId) {
    return isSessionInProgressAtLocation(locationId);
  }

  processUserInput(locationId, userId, input) {
    let currentAction = state.shiritoriManager.currentActionForLocationId[locationId];
    if (!currentAction) {
      return false;
    }
    if (currentAction.tryAcceptUserInput) {
      return currentAction.tryAcceptUserInput(userId, input);
    }
    return false;
  }

  stop(locationId, userId) {
    return endGame(locationId, EndGameReason.STOP_COMMAND, {userId});
  }

  join(locationId, userId, userName) {
    return joinCommand(locationId, userId, userName);
  }

  botLeave(locationId, userId) {
    return botLeaveCommand(locationId, userId);
  }
}

module.exports = new ShiritoriManager();
module.exports.END_STATUS_ERROR = END_STATUS_ERROR;
module.exports.EndGameReason = EndGameReason;
