spyMiddleware ![building status](https://api.travis-ci.org/drpicox/spy-middleware.svg?branch=master)
=============

Middleware that spyies all actions and allows you to wait for specific
actions or events.


Quick Use
---------

Install with npm:

```bash
npm install spy-middleware
```

or for just testing:

```bash
npm install -D spy-middleware
```

Use in your code:

```javascript
import { createStore, applyMiddleware } from 'redux'
import makeSpyMiddleware from 'spy-middleware'

import { fetchTopic, PUT_TOPIC } from '../actions'
import middleware from '../middleware'
import reducer from '../reducer'
import { getTopic } from '../selectors'

let spyMiddleware
let store
beforeEach(() => {
  spyMiddleware = makeSpyMiddleware()
  store = createStore(reducer, applyMiddleware(middleware, spyMiddleware))
})

test("when a fetchTopic is requested it retrieves the topic from the REST service", async () => {
  fetch.mockResponse('This is the readme')
  store.dispatch(fetchTopic('README'))

  await spyMiddleware.untilNext(PUT_TOPIC)

  const topic = getTopic(store.getState(), { name: 'README' })
  expect(topic).toEqual('This is the readme')
})
```


makeSpyMiddleware()
-------------------

It creates a middleware compatible with redux [applyMiddleware](https://redux.js.org/docs/api/applyMiddleware.html) that
contains specific methods to spy what is happening inside the store.

```javascript
import makeSpyMiddleware from 'spy-middleware'

let spyMiddleware
beforeEach(() => {
  spyMiddleware = makeSpyMiddleware()
})
```


spyMiddleware
-------------

Redux middleware that has to be applied with [applyMiddleware](https://redux.js.org/docs/api/applyMiddleware.html)

```javascript
let store
beforeEach(() => {
  store = createStore(reducer, applyMiddleware(spyMiddleware))
})
```

### ### spyMiddleware.getActions(): Action[]

Get all dispatched and reduced actions.

```javascript
store.dispatch(startAction)
store.dispatch(stopAction)
store.dispatch(resumeAction)

const actions = spyMiddleware.getActions()
expect(actions).toEqual([startAction, stopAction, resumeAction])
```

### ### spyMiddleware.getAction(string|regExp|(action)=>bool): Action

Get the last action that satisfies the condition or undefined if none.

```javascript
store.dispatch(startAction)
store.dispatch(stopAction)
store.dispatch(resumeAction)

const foundAction = spyMiddleware.getAction(/^S/i)
expect(foundAction).toBe(stopAction)
```

### ### spyMiddleware.untilNext(string|regExp|(action)=>bool): Promise<Action>

Returns a promise which is resolved when the matching action
is dispatched and reduced.

```javascript
let actionsBeforeAwait
let actionsAfterAwait

delay(1).then(() => store.dispatch(startAction))
actionsBeforeAwait = spyMiddleware.getActions()
await spyMiddleware.untilNext(START)
actionsAfterAwait = spyMiddleware.getActions()

expect(actionsBeforeAwait).toEqual([])
expect(actionsAfterAwait).toEqual([startAction])
```

The promise is resolved with the first action
fired after `untilNext` call
that satisfies the condition.

```javascript
delay(1).then(() => store.dispatch(startAction))
const foundStartAction = await spyMiddleware.untilNext(START)

expect(foundStartAction).toBe(startAction)
```


### ### spyMiddleware.until(string|regExp|(action)=>bool): Promise<Action>

Returns a promise which is resolved when the matching action
is dispatched and reduced or if a matching action was resolved in the past.

```javascript
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
```


The promise is resolved with the first action
ever dispatched
that satisfies the condition.

```javascript
store.dispatch(startAction)
const foundStartAction = await spyMiddleware.untilNext(START)

expect(foundStartAction).toBe(startAction)
```

### ### spyMiddleware.clearActions(): void

Clears the list of dispatched actions.

```javascript
store.dispatch(startAction)
store.dispatch(stopAction)

spyMiddleware.clearActions()

store.dispatch(resumeAction)

const actions = spyMiddleware.getActions()

expect(actions).toEqual([resumeAction])
```
