/** vim: et:ts=4:sw=4:sts=4
 * @license RequireJS 2.3.6 Copyright jQuery Foundation and other contributors.
 * Released under MIT license, https://github.com/requirejs/requirejs/blob/master/LICENSE
 */
//Not using strict: uneven strict support in browsers, #392, and causes
//problems with requirejs.exec()/transpiler plugins that may not be strict.
/*jslint regexp: true, nomen: true, sloppy: true */
/*global window, navigator, document, importScripts, setTimeout, opera */

const log = console.debug;
log('加载 requiresjs');

var requirejs, require, define;
function fact (global, setTimeout) {
  var req, s, head, baseElement, dataMain, src,
    interactiveScript, currentlyAddingScript, mainScript, subPath,
    commentRegExp = /\/\*[\s\S]*?\*\/|([^:"'=]|^)\/\/.*$/mg,
    cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
    jsSuffixRegExp = /\.js$/,
    currDirRegExp = /^\.\//,

    contexts = {},
    cfg = {},
    globalDefQueue = [],
    useInteractive = false;

  //Could match something like ')//comment', do not lose the prefix to comment.
  function commentReplace(match, singlePrefix) {
    return singlePrefix || '';
  }



  function defaultOnError(err) {
    throw err;
  }

  //Allow getting a global that is expressed in
  //dot notation, like 'a.b.c'.
  function getGlobal(value) {
    if (!value) {
      return value;
    }
    var g = global;
    each(value.split('.'), function (part) {
      g = g[part];
    });
    return g;
  }

  /**
   * Constructs an error with a pointer to an URL with more information.
   * @param {String} id the error ID that maps to an ID on a web page.
   * @param {String} message human readable error.
   * @param {Error} [err] the original error, if there is one.
   *
   * @returns {Error}
   */
  function makeError(id, msg, err, requireModules) {
    var e = new Error(msg + '\nhttps://requirejs.org/docs/errors.html#' + id);
    e.requireType = id;
    e.requireModules = requireModules;
    if (err) {
      e.originalError = err;
    }
    return e;
  }

  if (typeof define !== 'undefined') {
    //If a define is already in play via another AMD loader,
    //do not overwrite.
    return;
  }

  if (typeof requirejs !== 'undefined') {
    if (isFunction(requirejs)) {
      //Do not overwrite an existing requirejs instance.
      return;
    }
    cfg = requirejs;
    requirejs = undefined;
  }

  //Allow for a require config object
  if (typeof require !== 'undefined' && !isFunction(require)) {
    //assume it is a config object.
    cfg = require;
    require = undefined;
  }



  /**
   * Main entry point.
   *
   * 如果require的唯一参数是一个字符串，那么将获取由该字符串表示的模块以供适当的上下文使用。
   *
   * 如果第一个参数是一个数组，那么它将被视为要获取的依赖字符串名称的数组。可以指定一个可选的函数回调，在所有依赖项都可用时执行。
   *
   * Make a local req variable to help Caja compliance (it assumes things
   * on a require that are not standardized), and to give a short
   * name for minification/local scope use.
   */
  req = requirejs = function (deps, callback, errback, optional) {

    //Find the right context, use default
    var context, config,
      contextName = defContextName;

    // Determine if have config object in the call.
    // 3种情况
    // 1. req({})
    // 2. req({ baseUrl: 'xx', deps: [] })
    // 3. req([deps], cb)
    if (!isArray(deps) && typeof deps !== 'string') {
      // deps is a config object
      config = deps;
      if (isArray(callback)) {
        // Adjust args if there are dependencies
        deps = callback;
        callback = errback;
        errback = optional;
      } else {
        deps = [];
      }
    }

    if (config && config.context) {
      contextName = config.context;
    }

    context = getOwn(contexts, contextName);
    if (!context) {
      context = contexts[contextName] = req.s.newContext(contextName);
    }
    if (config) {
      context.configure(config);
    }
    return context.require(deps, callback, errback);
  };

  /**
   * Support require.config() to make it easier to cooperate with other
   * AMD loaders on globally agreed names.
   */
  req.config = function (config) {
    return req(config);
  };

  /**
   * Execute something after the current tick
   * of the event loop. Override for other envs
   * that have a better solution than setTimeout.
   * @param  {Function} fn function to execute later.
   */
  req.nextTick = typeof setTimeout !== 'undefined' ? function (fn) {
    setTimeout(fn, 4);
  } : function (fn) { fn(); };

  // Export require as a global, but only if it does not already exist.
  if (!require) {
    require = req;
  }

  //Used to filter out dependencies that are already paths.
  req.jsExtRegExp = /^\/|:|\?|\.js$/;
  req.isBrowser = isBrowser;
  s = req.s = {
    contexts: contexts,
    newContext: newContext
  };

  //Create default context.
  // debugger;
  req({});

  //Exports some context-sensitive methods on global require.
  each([
    'toUrl',
    'undef',
    'defined',
    'specified'
  ], function (prop) {
    //Reference from contexts instead of early binding to default context,
    //so that during builds, the latest instance of the default context
    //with its config gets used.
    req[prop] = function () {
      var ctx = contexts[defContextName];
      return ctx.require[prop].apply(ctx, arguments);
    };
  });

  if (isBrowser) {
    head = s.head = document.getElementsByTagName('head')[0];
    //If BASE tag is in play, using appendChild is a problem for IE6.
    //When that browser dies, this can be removed. Details in this jQuery bug:
    //http://dev.jquery.com/ticket/2709
    baseElement = document.getElementsByTagName('base')[0];
    if (baseElement) {
      head = s.head = baseElement.parentNode;
    }
  }

  /**
   * Any errors that require explicitly generates will be passed to this
   * function. Intercept/override it if you want custom error handling.
   * @param {Error} err the error object.
   */
  req.onError = defaultOnError;

  // Creates the node for the load command. Only used in browser envs.
  req.createNode = function (config, moduleName, url) {
    var node = config.xhtml ?
      document.createElementNS('http://www.w3.org/1999/xhtml', 'html:script') :
      document.createElement('script');
    node.type = config.scriptType || 'text/javascript';
    node.charset = 'utf-8';
    node.async = true;
    return node;
  };

  /**
   * Does the request to load a module for the browser case.
   * Make this a separate function to allow other environments
   * to override it.
   *
   * @param {Object} context the require context to find state.
   * @param {String} moduleName the name of the module.
   * @param {Object} url the URL to the module.
   */
  req.load = function (context, moduleName, url) {
    var config = (context && context.config) || {},
      node;
    if (isBrowser) {
      //In the browser so use a script tag
      node = req.createNode(config, moduleName, url);

      node.setAttribute('data-requirecontext', context.contextName);
      node.setAttribute('data-requiremodule', moduleName);

      //Set up load listener. Test attachEvent first because IE9 has
      //a subtle issue in its addEventListener and script onload firings
      //that do not match the behavior of all other browsers with
      //addEventListener support, which fire the onload event for a
      //script right after the script execution. See:
      //https://connect.microsoft.com/IE/feedback/details/648057/script-onload-event-is-not-fired-immediately-after-script-execution
      //UNFORTUNATELY Opera implements attachEvent but does not follow the script
      //script execution mode.
      if (node.attachEvent &&
        //Check if node.attachEvent is artificially added by custom script or
        //natively supported by browser
        //read https://github.com/requirejs/requirejs/issues/187
        //if we can NOT find [native code] then it must NOT natively supported.
        //in IE8, node.attachEvent does not have toString()
        //Note the test for "[native code" with no closing brace, see:
        //https://github.com/requirejs/requirejs/issues/273
        !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) &&
        !isOpera) {
        //Probably IE. IE (at least 6-8) do not fire
        //script onload right after executing the script, so
        //we cannot tie the anonymous define call to a name.
        //However, IE reports the script as being in 'interactive'
        //readyState at the time of the define call.
        useInteractive = true;

        node.attachEvent('onreadystatechange', context.onScriptLoad);
        //It would be great to add an error handler here to catch
        //404s in IE9+. However, onreadystatechange will fire before
        //the error handler, so that does not help. If addEventListener
        //is used, then IE will fire error before load, but we cannot
        //use that pathway given the connect.microsoft.com issue
        //mentioned above about not doing the 'script execute,
        //then fire the script load event listener before execute
        //next script' that other browsers do.
        //Best hope: IE10 fixes the issues,
        //and then destroys all installs of IE 6-9.
        //node.attachEvent('onerror', context.onScriptError);
      } else {
        node.addEventListener('load', context.onScriptLoad, false);
        node.addEventListener('error', context.onScriptError, false);
      }
      node.src = url;

      // Calling onNodeCreated after all properties on the node have been
      // set, but before it is placed in the DOM.
      if (config.onNodeCreated) {
        config.onNodeCreated(node, config, moduleName, url);
      }

      //For some cache cases in IE 6-8, the script executes before the end
      //of the appendChild execution, so to tie an anonymous define
      //call to the module name (which is stored on the node), hold on
      //to a reference to this node, but clear after the DOM insertion.
      currentlyAddingScript = node;
      if (baseElement) {
        head.insertBefore(node, baseElement);
      } else {
        head.appendChild(node);
      }
      currentlyAddingScript = null;

      return node;
    } else if (isWebWorker) {
      try {
        //In a web worker, use importScripts. This is not a very
        //efficient use of importScripts, importScripts will block until
        //its script is downloaded and evaluated. However, if web workers
        //are in play, the expectation is that a build has been done so
        //that only one script needs to be loaded anyway. This may need
        //to be reevaluated if other use cases become common.

        // Post a task to the event loop to work around a bug in WebKit
        // where the worker gets garbage-collected after calling
        // importScripts(): https://webkit.org/b/153317
        setTimeout(function() {}, 0);
        importScripts(url);

        //Account for anonymous modules
        context.completeLoad(moduleName);
      } catch (e) {
        context.onError(makeError('importscripts',
          'importScripts failed for ' +
          moduleName + ' at ' + url,
          e,
          [moduleName]));
      }
    }
  };

  function getInteractiveScript() {
    if (interactiveScript && interactiveScript.readyState === 'interactive') {
      return interactiveScript;
    }

    eachReverse(scripts(), function (script) {
      if (script.readyState === 'interactive') {
        return (interactiveScript = script);
      }
    });
    return interactiveScript;
  }

  //Look for a data-main script attribute, which could also adjust the baseUrl.
  if (isBrowser && !cfg.skipDataMain) {
    //Figure out baseUrl. Get it from the script tag with require.js in it.
    eachReverse(scripts(), function (script) {
      //Set the 'head' where we can append children by
      //using the script's parent.
      if (!head) {
        head = script.parentNode;
      }

      //Look for a data-main attribute to set main script for the page
      //to load. If it is there, the path to data main becomes the
      //baseUrl, if it is not already set.
      dataMain = script.getAttribute('data-main');
      if (dataMain) {
        //Preserve dataMain in case it is a path (i.e. contains '?')
        mainScript = dataMain;

        //Set final baseUrl if there is not already an explicit one,
        //but only do so if the data-main value is not a loader plugin
        //module ID.
        if (!cfg.baseUrl && mainScript.indexOf('!') === -1) {
          //Pull off the directory of data-main for use as the
          //baseUrl.
          src = mainScript.split('/');
          mainScript = src.pop();
          subPath = src.length ? src.join('/')  + '/' : './';

          cfg.baseUrl = subPath;
        }

        //Strip off any trailing .js since mainScript is now
        //like a module name.
        mainScript = mainScript.replace(jsSuffixRegExp, '');

        //If mainScript is still a path, fall back to dataMain
        if (req.jsExtRegExp.test(mainScript)) {
          mainScript = dataMain;
        }

        //Put the data-main script in the files to load.
        cfg.deps = cfg.deps ? cfg.deps.concat(mainScript) : [mainScript];

        return true;
      }
    });
  }

  /**
   * The function that handles definitions of modules. Differs from
   * require() in that a string for the module should be the first argument,
   * and the function to execute after dependencies are loaded should
   * return a value to define the module corresponding to the first argument's
   * name.
   */
  define = function (name, deps, callback) {
    var node, context;

    //Allow for anonymous modules
    if (typeof name !== 'string') {
      //Adjust args appropriately
      callback = deps;
      deps = name;
      name = null;
    }

    //This module may not have dependencies
    if (!isArray(deps)) {
      callback = deps;
      deps = null;
    }

    //If no name, and callback is a function, then figure out if it a
    //CommonJS thing with dependencies.
    // false
    if (!deps && isFunction(callback)) {
      deps = [];
      //Remove comments from the callback string,
      //look for require calls, and pull them into the dependencies,
      //but only if there are function args.
      if (callback.length) {
        callback
          .toString()
          .replace(commentRegExp, commentReplace)
          .replace(cjsRequireRegExp, function (match, dep) {
            deps.push(dep);
          });

        //May be a CommonJS thing even without require calls, but still
        //could use exports, and module. Avoid doing exports and module
        //work though if it just needs require.
        //REQUIRES the function to expect the CommonJS variables in the
        //order listed below.
        deps = (callback.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(deps);
      }
    }

    // If in IE 6-8 and hit an anonymous define() call, do the interactive work.
    // false
    if (useInteractive) {
      node = currentlyAddingScript || getInteractiveScript();
      if (node) {
        if (!name) {
          name = node.getAttribute('data-requiremodule');
        }
        context = contexts[node.getAttribute('data-requirecontext')];
      }
    }

    //Always save off evaluating the def call until the script onload handler.
    //This allows multiple modules to be in a file without prematurely
    //tracing dependencies, and allows for anonymous module support,
    //where the module name is not known until the script onload event
    //occurs. If no context, use the global queue, and get it processed
    //in the onscript load callback.
    // false
    if (context) {
      context.defQueue.push([name, deps, callback]);
      context.defQueueMap[name] = true;
    } else {
      globalDefQueue.push([name, deps, callback]);
    }
  };

  define.amd = {
    jQuery: true
  };

  /**
   * Executes the text. Normally just uses eval, but can be modified
   * to use a better, environment-specific call. Only used for transpiling
   * loader plugins, not for plain JS modules.
   * @param {String} text the text to execute/evaluate.
   */
  req.exec = function (text) {
    /*jslint evil: true */
    return eval(text);
  };

  //Set up with config info.
  req(cfg);
};

fact(this, typeof setTimeout === 'undefined' ? undefined : setTimeout);