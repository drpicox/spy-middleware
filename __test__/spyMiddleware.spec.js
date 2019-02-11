const { createStore, applyMiddleware } = require('redux')
const makeSpyMiddleware = require('../')

describe('makeSpyMiddleware', () => {
  const START = 'START'
  const STOP = 'STOP'
  const RESUME = 'RESUME'

  const reduxInitAction = expect.any(Object)
  const startAction = { type: START }
  const stopAction = { type: STOP }
  const resumeAction = { type: RESUME }

  let spyMiddleware
  let store
  let delays

  beforeEach(() => {
    delays = []
    const reducer = (state = [], action) => state.concat([action])
    spyMiddleware = makeSpyMiddleware()
    store = createStore(reducer, applyMiddleware(spyMiddleware))
  })

  afterEach(async () => {
    await Promise.all(delays)
  })

  function delay(ms) {
    const promise = new Promise(resolve => setTimeout(resolve, ms))
    delays.push(promise)
    return promise
  }

  test('the example store that saves all received actions in order in the state', () => {
    store.dispatch(startAction)
    store.dispatch(stopAction)
    store.dispatch(resumeAction)

    expect(store.getState()).toEqual([
      reduxInitAction,
      startAction,
      stopAction,
      resumeAction,
    ])
  })

  test('spyMiddleware keeps track of all dispatched actions', () => {
    store.dispatch(startAction)
    store.dispatch(stopAction)
    store.dispatch(resumeAction)

    const actions = spyMiddleware.getActions()
    expect(actions).toEqual([startAction, stopAction, resumeAction])
  })

  test('reduxInitAction is not tracked by spyMiddleware', () => {
    const actions = spyMiddleware.getActions()

    expect(actions).not.toContainEqual(reduxInitAction)
  })

  test('you can look for a dispatched action by type name', () => {
    store.dispatch(startAction)

    const foundAction = spyMiddleware.getAction(START)
    expect(foundAction).toBe(startAction)
  })

  test('you can look for a dispatched action by regex matching type', () => {
    store.dispatch(startAction)

    const foundAction = spyMiddleware.getAction(/^S/)
    expect(foundAction).toBe(startAction)
  })

  test('you can look for a dispatched action by matching function', () => {
    store.dispatch(startAction)

    const foundAction = spyMiddleware.getAction(
      action => action.type.length > 3
    )
    expect(foundAction).toBe(startAction)
  })

  test('if you ask for an action and more than one matches it takes the last one', () => {
    store.dispatch(startAction)
    store.dispatch(stopAction)

    const foundAction = spyMiddleware.getAction(action => true)
    expect(foundAction).toBe(stopAction)
  })

  test('you can use it to wait for actions', async () => {
    let actionsBeforeAwait
    let actionsAfterAwait

    delay(1).then(() => store.dispatch(startAction))
    actionsBeforeAwait = spyMiddleware.getActions()
    await spyMiddleware.untilNext(START)
    actionsAfterAwait = spyMiddleware.getActions()

    expect(actionsBeforeAwait).toEqual([])
    expect(actionsAfterAwait).toEqual([startAction])
  })

  test('you can use it to wait for actions using regex', async () => {
    let actionsBeforeAwait
    let actionsAfterAwait

    delay(1).then(() => store.dispatch(startAction))
    actionsBeforeAwait = spyMiddleware.getActions()
    await spyMiddleware.untilNext(/^S/)
    actionsAfterAwait = spyMiddleware.getActions()

    expect(actionsBeforeAwait).toEqual([])
    expect(actionsAfterAwait).toEqual([startAction])
  })

  test('you can use it to wait for actions using a match function', async () => {
    let actionsBeforeAwait
    let actionsAfterAwait

    delay(1).then(() => store.dispatch(startAction))
    actionsBeforeAwait = spyMiddleware.getActions()
    await spyMiddleware.untilNext(action => action.type.length > 3)
    actionsAfterAwait = spyMiddleware.getActions()

    expect(actionsBeforeAwait).toEqual([])
    expect(actionsAfterAwait).toEqual([startAction])
  })

  test('you can evaluate any condition that you want to meet in the matching function', async () => {
    let secondAction

    delay(1).then(() => store.dispatch(startAction))
    delay(1).then(() => store.dispatch(stopAction))
    delay(1).then(() => store.dispatch(resumeAction))

    await spyMiddleware.untilNext(action => {
      if (spyMiddleware.getActions().length === 2) {
        secondAction = action
        return true
      }
      return false
    })

    expect(secondAction).toBe(stopAction)
  })

  test('untilNext resolves the promise with the first action found after the call that satisfies the condition', async () => {
    store.dispatch(startAction)
    delay(1).then(() => store.dispatch(stopAction))
    const matchingAction = await spyMiddleware.untilNext(/^S/)

    expect(matchingAction).toBe(stopAction)
  })

  test('until works almost equal to untilNext', async () => {
    let actionsBeforeAwait
    let actionsAfterAwait

    delay(1).then(() => store.dispatch(startAction))
    actionsBeforeAwait = spyMiddleware.getActions()
    await spyMiddleware.until(START)
    actionsAfterAwait = spyMiddleware.getActions()

    expect(actionsBeforeAwait).toEqual([])
    expect(actionsAfterAwait).toEqual([startAction])
  })

  test('but until is automatically resolved if the action was already present', async () => {
    let actionFoundByUntil
    let actionFoundByUntilNext

    store.dispatch(startAction)
    const untilFinished = spyMiddleware.until(action => {
      if (/^S/.test(action.type)) {
        actionFoundByUntil = action
        return true
      }
      return false
    })
    const untilNextFinished = spyMiddleware.untilNext(action => {
      if (/^S/.test(action.type)) {
        actionFoundByUntilNext = action
        return true
      }
      return false
    })
    store.dispatch(stopAction)

    await untilFinished
    await untilNextFinished

    expect(actionFoundByUntil).toBe(startAction)
    expect(actionFoundByUntilNext).toBe(stopAction)
  })

  test('until also matches regExp', async () => {
    store.dispatch(startAction)
    await spyMiddleware.until(/^S/)
  })

  test('until resolves the promise with the first action ever dispatched that satisfies the condition', async () => {
    store.dispatch(startAction)
    delay(1).then(() => store.dispatch(stopAction))
    const matchingAction = await spyMiddleware.until(/^S/)

    expect(matchingAction).toBe(startAction)
  })

  test('you can clear the list of tracked actions', () => {
    store.dispatch(startAction)
    store.dispatch(stopAction)

    spyMiddleware.clearActions()

    store.dispatch(resumeAction)

    const actions = spyMiddleware.getActions()

    expect(actions).toEqual([resumeAction])
  })

  test('until does not consider actions dispatched before last clear', async () => {
    store.dispatch(stopAction)
    spyMiddleware.clearActions()

    delay(1).then(() => store.dispatch(startAction))
    const action = await spyMiddleware.until(/.*/)

    expect(action).toEqual(startAction)
  })
})
