/* See license.txt for terms of usage */

//
FBL.ns(function() { with (FBL) {
// ************************************************************************************************
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;

top.Firebug.Console.injector = {

    attachConsole: function(context, win)
    {
        var src = this.getInjectedSource();
        Firebug.CommandLine.evaluate(src, context, null, win);  // win maybe frame
        delete this.injectedSource; // XXXXXXXXXXXXXX TODO remove to cache
        context.firebugConsoleHandler = new FirebugConsoleHandler(context, win);
        win.addEventListener('firebugAppendConsole', context.firebugConsoleHandler.handleEvent, true); // capturing
    },

    getInjectedSource: function()
    {
        if (!this.injectedSource)
            this.injectedSource = this.getResource("chrome://firebug/content/consoleInjected.js");
        return this.injectedSource;
    },

    getResource: function(aURL)
    {
        var ioService=Components.classes["@mozilla.org/network/io-service;1"]
            .getService(Components.interfaces.nsIIOService);
        var scriptableStream=Components
            .classes["@mozilla.org/scriptableinputstream;1"]
            .getService(Components.interfaces.nsIScriptableInputStream);

        var channel=ioService.newChannel(aURL,null,null);
        var input=channel.open();
        scriptableStream.init(input);
        var str=scriptableStream.read(input.available());
        scriptableStream.close();
        input.close();
        return str;
    }
}

function FirebugConsoleHandler(context, win)
{
    this.handleEvent = function(event)
    {
        
        var element = event.target;        
        var firstAddition = element.getAttribute("firstAddition");
        var lastAddition = element.getAttribute("lastAddition");
        var methodName = element.getAttribute("methodName");
        var hosed_userObjects = win.wrappedJSObject.console.userObjects;

        FBTrace.sysout("typeof(hosed_userObjects) "+ (typeof(hosed_userObjects))+"\n");   
        //FBTrace.sysout("hosed_userObjects instanceof win.Array "+ (hosed_userObjects instanceof win.Array)+"\n");
        //FBTrace.sysout("hosed_userObjects instanceof win.wrappedJSObject.Array "+(hosed_userObjects instanceof win.wrappedJSObject.Array)+"\n");
        FBTrace.dumpProperties("hosed_userObjects", hosed_userObjects);
        
        if (lastAddition < firstAddition) 
            return;
        
        var userObjects = [];
        FBTrace.sysout("typeof(userObjects) "+ (typeof(userObjects))+"\n");   
        
        for (var i = firstAddition; i <= lastAddition; i++)
        {
            if (hosed_userObjects[i])
                userObjects[i] = hosed_userObjects[i];
            else
                break;
        }
        
        if (FBTrace.DBG_CONSOLE || true)
        {
            FBTrace.dumpProperties("FirebugConsoleHandler: element",  element);
            FBTrace.dumpProperties("FirebugConsoleHandler event:", event);
            FBTrace.sysout("FirebugConsoleHandler: first to last:"+firstAddition+" - "+lastAddition+"\n");
            FBTrace.dumpProperties("FirebugConsoleHandler: userObjects",  userObjects);
            FBTrace.sysout("typeof(userObjects) "+ (typeof(userObjects))+"\n");   
        }
        
        var subHandler = context.firebugConsoleHandler[methodName];
        if (subHandler)
        {
            subHandler.apply(context.firebugConsoleHandler, userObjects);
        }
        else
        {
            context.firebugConsoleHandler.log("FirebugConsoleHandler does not support "+methodName);
        }

    };

    this.firebug = Firebug.version;

    // We store these functions as closures so that they can access the context privately,
    // because it would be insecure to store context as a property of window.console and
    // and therefore expose it to web pages.

    this.log = function()
    {
        logFormatted(arguments, "log");
    };

    this.debug = function()
    {
        logFormatted(arguments, "debug", true);
    };

    this.info = function()
    {
        logFormatted(arguments, "info", true);
    };

    this.warn = function()
    {
        logFormatted(arguments, "warn", true);
    };

    this.error = function()
    {
        Firebug.Errors.increaseCount(context);
        logFormatted(arguments, "error", true);
    };

    this.assert = function(x)
    {
        if (!x)
            logAssert(FBL.sliceArray(arguments, 1), ["%o", x]);
    };

    this.dir = function(o)
    {
        Firebug.Console.log(o, context, "dir", Firebug.DOMPanel.DirTable);
    };

    this.dirxml = function(o)
    {
        if (o instanceof Window)
            o = o.document.documentElement;
        else if (o instanceof Document)
            o = o.documentElement;

        Firebug.Console.log(o, context, "dirxml", Firebug.HTMLPanel.SoloElement);
    };

    this.trace = function()
    {
        var trace = FBL.getCurrentStackTrace(context);
        Firebug.Console.log(trace, context, "stackTrace");
    };

    this.group = function()
    {
        var sourceLink = FBL.getStackSourceLink(Components.stack);
        Firebug.Console.openGroup(arguments, null, "group", null, false, sourceLink);
    };

    this.groupEnd = function()
    {
        Firebug.Console.closeGroup(context);
    };

    this.time = function(name, reset)
    {
        if (!name)
            return;

        var time = new Date().getTime();

        if (!context.timeCounters)
            context.timeCounters = {};

        if (!reset && context.timeCounters.hasOwnProperty(name))
            return;

        context.timeCounters[name] = time;
    };

    this.timeEnd = function(name)
    {
        var time = new Date().getTime();

        if (!context.timeCounters)
            return;

        var timeCounter = context.timeCounters[name];
        if (timeCounter)
        {
            var diff = time - timeCounter;
            var label = name + ": " + diff + "ms";

            logFormatted([label], null, true);

            delete context.timeCounters[name];
        }
        return diff;
    };

    this.profile = function(title)
    {
        Firebug.Profiler.startProfiling(context, title);
    };

    this.profileEnd = function()
    {
        Firebug.Profiler.stopProfiling(context);
    };

    this.count = function(key)
    {
        var frameId = FBL.getStackFrameId();
        if (frameId)
        {
            if (!context.frameCounters)
                context.frameCounters = {};

            if (key != undefined)
                frameId += key;

            var frameCounter = context.frameCounters[frameId];
            if (!frameCounter)
            {
                var logRow = logFormatted(["0"], null, true, true);

                frameCounter = {logRow: logRow, count: 1};
                context.frameCounters[frameId] = frameCounter;
            }
            else
                ++frameCounter.count;

            var label = key == undefined
                ? frameCounter.count
                : key + " " + frameCounter.count;

            frameCounter.logRow.firstChild.firstChild.nodeValue = label;
        }
    };

/*
    this.addTab = function(url, title, parentPanel)
    {
        context.chrome.addTab(context, url, title, parentPanel);
    };

    this.removeTab = function(url)
    {
        context.chrome.removeTab(context, url);
    };
*/

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    function logFormatted(args, className, linkToSource, noThrottle)
    {
        var sourceLink = linkToSource ? FBL.getStackSourceLink(Components.stack) : null;
        return Firebug.Console.logFormatted(args, context, className, noThrottle, sourceLink);
    }

    function logAssert(args, description)
    {
        Firebug.Errors.increaseCount(context);

        if (!args || !args.length)
            args = [FBL.$STR("Assertion")];

        var sourceLink = FBL.getStackSourceLink(Components.stack);
        var row = Firebug.Console.log(null, context, "assert", FirebugReps.Assert, true, sourceLink);

        var argsRow = row.firstChild.firstChild;
        Firebug.Console.appendFormatted(args, argsRow, context);

        var descRow = argsRow.nextSibling;
        Firebug.Console.appendFormatted(description, descRow, context);

        row.scrollIntoView();
    }
}

}});