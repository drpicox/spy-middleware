function makeDeferred() {
  var deferred = {}

  deferred.promise = new Promise(function(resolve) {
    deferred.resolve = resolve
  })
  return deferred
}

function makeSpyMiddleware() {
  function spyMiddleware() {
    var actions = []
    var untils = []

    function toMatch(cond) {
      if (typeof cond === 'string')
        return function matchString(action) {
          return action.type === cond
        }
      else if (cond instanceof RegExp)
        return function matchRegex(action) {
          return cond.test(action.type)
        }
      else return cond
    }

    function getActions() {
      return actions.slice()
    }

    function getAction(cond) {
      var match = toMatch(cond)
      return actions
        .slice()
        .reverse()
        .find(match)
    }

    function clearActions() {
      actions = []
    }

    function until(cond) {
      var action = getAction(cond)
      if (action) return Promise.resolve(action)
      return untilNext(cond)
    }

    function untilNext(cond) {
      var deferred = makeDeferred()
      var promise = deferred.promise
      var resolve = deferred.resolve
      untils.push({ match: toMatch(cond), resolve: resolve })
      return promise
    }

    spyMiddleware.getActions = getActions
    spyMiddleware.getAction = getAction
    spyMiddleware.clearActions = clearActions
    spyMiddleware.until = until
    spyMiddleware.untilNext = untilNext

    return function(next) {
      return function(action) {
        next(action)
        actions.push(action)

        var actives = untils.filter(function matchUntilAction(until) {
          return until.match(action)
        })
        var inactives = untils.filter(function matchUntilAction(until) {
          return !until.match(action)
        })

        actives.forEach(function resolveUntil(until) {
          until.resolve(action)
        })
        untils = inactives
      }
    }
  }
  return spyMiddleware
}

module.exports = makeSpyMiddleware
