var FBL = {};

(function() {
// ************************************************************************************************

// ************************************************************************************************
// Namespaces

var namespaces = [];

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

this.ns = function(fn)
{
    var ns = {};
    namespaces.push(fn, ns);
    return ns;
};

this.initialize = function()
{
    //if (FBTrace.DBG_INITIALIZE) FBTrace.sysout("FBL.initialize BEGIN "+namespaces.length+" namespaces\n");

    for (var i = 0; i < namespaces.length; i += 2)
    {
        var fn = namespaces[i];
        var ns = namespaces[i+1];
        fn.apply(ns);
    }
    
    this.waitForInit();

    //if (FBTrace.DBG_INITIALIZE) FBTrace.sysout("FBL.initialize END "+namespaces.length+" namespaces\n");
};

this.waitForInit = function()
{
    if (document.body && typeof FBL.onReady == "function")
        FBL.onReady();
    else
        setTimeout(FBL.waitForInit, 200);
}


// ************************************************************************************************
// Basics

this.bind = function()
{
   var args = cloneArray(arguments), fn = args.shift(), object = args.shift();
   return function() { return fn.apply(object, arrayInsert(cloneArray(args), 0, arguments)); }
};

this.bindFixed = function()
{
    var args = cloneArray(arguments), fn = args.shift(), object = args.shift();
    return function() { return fn.apply(object, args); }
};

this.extend = function(l, r)
{
    var obj = l.prototype || l;
    for (var n in r)
        obj[n] = r[n];
        
    return obj;
};

this.inherit = function(l, r)
{
    if (!r)
    {
        r = l;
        var newOb = {};
    } 
    if (l.prototype)
        var newOb = new l;
    else
    {
        var newOb = {};
        for (var n in l)
            newOb[n] = l[n];
    }
        
    for (var n in r)
        newOb[n] = r[n];
    return newOb;
};

this.newClass = function()
{
    var newConstructor = function(){};
    newConstructor.extend = classExtend;
    
    return newConstructor;
}

var classExtend = function(r)
{
    for (var n in r)
        this.prototype[n] = r[n];
        
    return this;
};

this.keys = function(map)  // At least sometimes the keys will be on user-level window objects
{
    var keys = [];
    try
    {
        for (var name in map)  // enumeration is safe
            keys.push(name);   // name is string, safe
    }
    catch (exc)
    {
        // Sometimes we get exceptions trying to iterate properties
    }

    return keys;  // return is safe
};

this.createStyleSheet = function(doc, url)
{
    var style = doc.createElementNS("http://www.w3.org/1999/xhtml", "style");
    style.setAttribute("charset","utf-8");
    style.firebugIgnore = true;
    style.setAttribute("type", "text/css");
    style.innerHTML = this.getResource(url);
    return style;
}

this.addStyleSheet = function(doc, style)
{
    var heads = doc.getElementsByTagName("head");
    if (heads.length)
        heads[0].appendChild(style);
    else
        doc.documentElement.appendChild(style);
};

this.addScript = function(doc, id, src)
{
    var element = doc.createElementNS("http://www.w3.org/1999/xhtml", "script");
    element.setAttribute("type", "text/javascript");
    element.setAttribute("id", id);
    element.firebugIgnore = true;
    element.setAttribute("style", "display:none");
    element.innerHTML = src;
    if (doc.documentElement)
        doc.documentElement.appendChild(element);
    else
    {
        // See issue 1079, the svg test case gives this error
        //if (FBTrace.DBG_ERRORS)
        //    FBTrace.dumpProperties("lib.addScript doc has no documentElement:", doc);
    }
};

function cloneArray(array, fn)
{
   var newArray = [];

   if (fn)
       for (var i = 0; i < array.length; ++i)
           newArray.push(fn(array[i]));
   else
       for (var i = 0; i < array.length; ++i)
           newArray.push(array[i]);

   return newArray;
}



// ************************************************************************************************
// Browser detection

var userAgent = navigator.userAgent;
this.isFirefox = userAgent.indexOf("Firefox") != -1;
this.isIE      = userAgent.indexOf("MSIE") != -1;
this.isIE6     = /msie 6/i.test(navigator.appVersion);
this.isOpera   = userAgent.indexOf("Opera") != -1;
this.isSafari  = userAgent.indexOf("AppleWebKit") != -1;



// ************************************************************************************************
// Util

var HTMLtoEntity =
{
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&#39;",
    '"': "&quot;"
};

function replaceChars(ch)
{
    return HTMLtoEntity[ch];
};

this.escapeHTML = function(value)
{
    return (value+"").replace(/[<>&"']/g, replaceChars);
};



// ************************************************************************************************
// Empty

this.emptyFn = function(){};



// ************************************************************************************************
// Event

this.addEvent = function(object, name, handler)
{
    if (document.all)
        object.attachEvent("on"+name, handler);
    else
        object.addEventListener(name, handler, false);
}

this.removeEvent = function(object, name, handler)
{
    if (document.all)
        object.detachEvent("on"+name, handler);
    else
        object.removeEventListener(name, handler, false);
}

this.cancelEvent = function(e, preventDefault)
{
    if (!e) return;
    
    if (preventDefault)
    {
        if (e.preventDefault)
            e.preventDefault();
        else
            e.returnValue = false;
    }
    
    if (document.all)
        e.cancelBubble = true;
    else
        e.stopPropagation();
                
}



// ************************************************************************************************
// Ajax

this.Ajax =
  {
  
    requests: [],
    transport: null,
    states: ["Uninitialized","Loading","Loaded","Interactive","Complete"],
  
    initialize: function()
    {
        this.transport = this.getXHRObject();
    },
    
    getXHRObject: function()
    {
        var xhrObj = false;
        try
        {
            xhrObj = new XMLHttpRequest();
        }
        catch(e)
        {
            var progid = [
                    "MSXML2.XMLHTTP.5.0", "MSXML2.XMLHTTP.4.0", 
                    "MSXML2.XMLHTTP.3.0", "MSXML2.XMLHTTP", "Microsoft.XMLHTTP"
                ];
              
            for ( var i=0; i < progid.length; ++i ) {
                try
                {
                    xhrObj = new ActiveXObject(progid[i]);
                }
                catch(e)
                {
                    continue;
                }
                break;
            }
        }
        finally
        {
            return xhrObj;
        }
    },
    
    
    /**
     * Realiza uma requisição ajax.
     * 
     * @name request
     * @param {Object}   options               Opções da requisição.  
     * @param {String}   options.url           URL a ser requisitada.
     * @param {String}   options.type          Tipo de requisição ("get" ou "post"). O padrão é "get".
     * @param {Boolean}  options.async         Indica se a requisição é assíncrona. O padrão é "true".   
     * @param {String}   options.dataType      Dado requisitado ("text", "html", "xml" ou "json"). O padrão é "text".
     * @param {String}   options.contentType   ContentType a ser usado. O padrão é "application/x-www-form-urlencoded".  
     * @param {Function} options.onLoading     Função a ser executada antes da requisição ser enviada.
     * @param {Function} options.onLoaded      Função a ser executada logo que a requisição for enviada.
     * @param {Function} options.onInteractive Função a ser executada durante o recebimento da requisição.
     * @param {Function} options.onComplete    Função a ser executada ao completar a requisição.
     * @param {Function} options.onUpdate      Função a ser executada após completar a requisição.
     * @param {Function} options.onSuccess     Função a ser executada ao completar a requisição com sucesso.
     * @param {Function} options.onError       Função a ser executada ao completar a requisição com erro.
     */      
    request: function(options)
    {
        var o = options || {};
    
        // Configura as opções que não foram definidas para o seu valor padrão
        o.type = o.type && o.type.toLowerCase() || "get";
        o.async = o.async || true;
        o.dataType = o.dataType || "text"; 
        o.contentType = o.contentType || "application/x-www-form-urlencoded";
    
        this.requests.push(o);
    
        var s = this.getState();
        if (s == "Uninitialized" || s == "Complete") 
            this.sendRequest();
    },
    
    serialize: function(data)
    {
        var r = [""], rl = 0;
        if (data) {
            if (typeof data == "string")  r[rl++] = data
              
            else if (data.innerHTML && data.elements) {
                for (var i=0,el,l=(el=data.elements).length; i < l; i++)
                    if (el[i].name) {
                        r[rl++] = encodeURIComponent(el[i].name); 
                        r[rl++] = "=";
                        r[rl++] = encodeURIComponent(el[i].value);
                        r[rl++] = "&";
                    }
                    
            } else 
                for(param in data) {
                    r[rl++] = encodeURIComponent(param); 
                    r[rl++] = "=";
                    r[rl++] = encodeURIComponent(data[param]);
                    r[rl++] = "&";
                }
        }
        return r.join("").replace(/&$/, "");
    },
  
    sendRequest: function()
    {
        var t = FBL.Ajax.transport, r = FBL.Ajax.requests.shift(), data;
    
        // Abre o objeto XMLHttpRequest
        t.open(r.type, r.url, r.async);
    
        //setRequestHeaders();
    
        // Registra o objeto para que o servidor saiba que é uma requisição AJAX
        t.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    
        // Caso tenha sido informado algum dado
        if (data = FBL.Ajax.serialize(r.data))
          t.setRequestHeader("Content-Type", r.contentType);
    
        /** @ignore */
        // Tratamento de evento de mudança de estado
        t.onreadystatechange = function()
        { 
            FBL.Ajax.onStateChange(r); 
        }; 
    
        // Envia a requisição
        t.send(data);
    },
  
    /**
     * Função de tratamento da mudança de estado da requisição ajax.
     */     
    onStateChange: function(options)
    {
        var fn, o = options, t = this.transport;
        var state = this.getState(t); 
    
        if (fn = o["on" + state]) fn(this.getResponse(o), o);
    
        if (state == "Complete")
        {
            var success = t.status == 200, response = this.getResponse(o);
      
            if (fn = o["onUpdate"])
              fn(response, o);
      
            if (fn = o["on" + (success ? "Success" : "Failure")])
              fn(response, o);
      
            t.onreadystatechange = FBL.emptyFn;
      
            if (this.requests.length > 0) 
                setTimeout(this.sendRequest, 10);
        }
    },
  
    /**
     * Retorna a resposta de acordo com o tipo de dado requisitado.
     */  
    getResponse: function(options)
    {
        var t = this.transport, type = options.dataType;
    
        if      (t.status != 200) return t.statusText
        else if (type == "text")  return t.responseText
        else if (type == "html")  return t.responseText
        else if (type == "xml")   return t.responseXML
        else if (type == "json")  return eval("(" + t.responseText + ")");
    },
  
    /**
     * Retorna o atual estado da requisição ajax.
     */     
    getState: function()
    {
        return this.states[this.transport.readyState];
    }
  
};

this.Ajax.initialize();



// ************************************************************************************************
// Cookie, from http://www.quirksmode.org/js/cookies.html

this.createCookie = function(name,value,days)
{
    if (days) {
        var date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        var expires = "; expires="+date.toGMTString();
    }
    else var expires = "";
    document.cookie = name+"="+value+expires+"; path=/";
};

this.readCookie = function (name)
{
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++)
    {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
};

this.eraseCookie = function(name)
{
    createCookie(name,"",-1);
};



// ************************************************************************************************
// http://www.mister-pixel.com/#Content__state=is_that_simple
this.fixIE6BackgroundImageCache = function(doc)
{
    doc = doc || document;
    try {
        doc.execCommand("BackgroundImageCache", false, true);
    } catch(err) {}
};


// ************************************************************************************************
}).apply(FBL);

FBL.ns(function() { with (FBL) {
// ************************************************************************************************

FBL.version = "1.2.2Xa";


// ************************************************************************************************
// Firebug

FBL.Firebug = 
{
    firebuglite: FBL.version
};

// ************************************************************************************************
// APIs

FBL.ConsoleAPI = inherit(FBL.Firebug);
 
FBL.ChromeAPI = inherit(FBL.Firebug); 


// ************************************************************************************************
// Internal variables

FBL.cacheID = "___FBL_";
FBL.alternateNS = "console2";
FBL.consoleNS = "console";
FBL.documentCache = {};
FBL.sourceURL = null;
FBL.baseURL = null;
FBL.skinURL = null;


// ************************************************************************************************
// Internal functions

extend(FBL,  
{
    onReady: function()
    {
        cacheDocument();
        findLocation();
        registerPublicNamespaces();
        
        var module;
        for(var name in Firebug)
        {
            module = Firebug[name];
            if(typeof module.onReady == "function")
                module.onReady();
        }
        
        if (isIE6)
            fixIE6BackgroundImageCache();
    },
  
    cacheDocument: function()
    {
        var els = document.getElementsByTagName("*");
        for (var i=0, l=els.length, el; i<l; i++)
        {
            el = els[i];
            el[cacheID] = i;
            documentCache[i] = el;
        }
    },
    
    findLocation: function() 
    {
        var rePath = /^(.*\/)[^\/]+\.\w+.*$/;
        var reProtocol = /^\w+:\/\//;
        var head = document.documentElement.firstChild;
        var path = "";
        
        for(var i=0, c=head.childNodes, ci; ci=c[i]; i++)
        {
            if ( ci.nodeName == "SCRIPT" && 
                 /firebug.*\.js/.test(ci.src) )
            {
              
                if (reProtocol.test(ci.src)) {
                    // absolute path
                    path = rePath.exec(ci.src)[1];
                  
                }
                else
                {
                    // relative path
                    var r = rePath.exec(ci.src);
                    var src = r ? r[1] : ci.src;
                    var rel = /^((\.\.\/)+)(.*)/.exec(src);
                    var lastFolder = /^(.*\/)\w+\/$/;
                    path = rePath.exec(location.href)[1];
                    
                    if (rel)
                    {
                        var j = rel[1].length/3;
                        var p;
                        while (j-- > 0)
                            path = lastFolder.exec(path)[1];

                        path += rel[3];
                    }
                }
                
                break;
            }
        }
        
        var m = path.match(/([^\/]+)\/$/);
        
        if (path && m)
        {
            sourceURL = path;
            baseURL = path.substr(0, path.length - m[1].length - 1);
            skinURL = baseURL + "skin/classic/";
        }
        else
        {
            //throw "N�o foi poss�vel encontrar o caminho automaticamente!";
        }
    },
    
    registerPublicNamespaces: function()
    {
        var isFirebugInstalled = isFirefox && window.console && window.console.firebug;
        FBL.NS = isFirebugInstalled ? FBL.alternateNS : "console";
      
        window[NS] = ConsoleAPI;
        FBL.loaded = true;
    }
  
});


// ************************************************************************************************
}});

FBL.ns(function() { with (FBL) {
// ************************************************************************************************

extend(FBL, {

    appendText: function(object, html)
    {
        html.push(escapeHTML(objectToString(object)));
    },
    
    appendNull: function(object, html)
    {
        html.push('<span class="objectBox-null">', escapeHTML(objectToString(object)), '</span>');
    },
    
    appendString: function(object, html)
    {
        html.push('<span class="objectBox-string">&quot;', escapeHTML(objectToString(object)),
            '&quot;</span>');
    },
    
    appendInteger: function(object, html)
    {
        html.push('<span class="objectBox-number">', escapeHTML(objectToString(object)), '</span>');
    },
    
    appendFloat: function(object, html)
    {
        html.push('<span class="objectBox-number">', escapeHTML(objectToString(object)), '</span>');
    },
    
    appendFunction: function(object, html)
    {
        var reName = /function ?(.*?)\(/;
        var m = reName.exec(objectToString(object));
        var name = m && m[1] ? m[1] : "function";
        html.push('<span class="objectBox-function">', escapeHTML(name), '()</span>');
    },
    
    appendObject: function(object, html)
    {
        try
        {
            if (object == undefined)
                appendNull("undefined", html);
            else if (object == null)
                appendNull("null", html);
            else if (typeof object == "string")
                appendString(object, html);
            else if (typeof object == "number")
                appendInteger(object, html);
            else if (typeof object == "boolean")
                appendInteger(object, html);
            else if (typeof object == "function")
                appendFunction(object, html);
            else if (object.nodeType == 1)
                appendSelector(object, html);
            else if (typeof object == "object")
            {
                if (typeof object.length != "undefined")
                    appendArray(object, html);
                else
                    appendObjectFormatted(object, html);
            }
            else
                appendText(object, html);
        }
        catch (exc)
        {
        }
    },
        
    appendObjectFormatted: function(object, html)
    {
        var text = objectToString(object);
        var reObject = /\[object (.*?)\]/;
    
        var m = reObject.exec(text);
        html.push('<span class="objectBox-object">', m ? m[1] : text, '</span>')
    },
    
    appendSelector: function(object, html)
    {
        var uid = object[cacheID];
        var uidString = uid ? [cacheID, '="', uid, '" id="', uid, '"'].join("") : "";
                        
        html.push('<span class="objectBox-selector"', uidString, '>');
    
        html.push('<span class="selectorTag">', escapeHTML(object.nodeName.toLowerCase()), '</span>');
        if (object.id)
            html.push('<span class="selectorId">#', escapeHTML(object.id), '</span>');
        if (object.className)
            html.push('<span class="selectorClass">.', escapeHTML(object.className), '</span>');
    
        html.push('</span>');
    },
    
    appendNode: function(node, html)
    {
        if (node.nodeType == 1)
        {
            var uid = node[cacheID];
            var uidString = uid ? [cacheID, '="', uid, '" id="', uid, '"'].join("") : "";                
            
            html.push(
                '<div class="objectBox-element"', uidString, '">',
                    '&lt;<span class="nodeTag">', node.nodeName.toLowerCase(), '</span>');
    
            for (var i = 0; i < node.attributes.length; ++i)
            {
                var attr = node.attributes[i];
                if (!attr.specified)
                    continue;
                
                html.push('&nbsp;<span class="nodeName">', attr.nodeName.toLowerCase(),
                    '</span>=&quot;<span class="nodeValue">', escapeHTML(attr.nodeValue),
                    '</span>&quot;')
            }
    
            if (node.firstChild)
            {
                html.push('&gt;</div><div class="nodeChildren">');
    
                for (var child = node.firstChild; child; child = child.nextSibling)
                    appendNode(child, html);
                    
                html.push('</div><div class="objectBox-element">&lt;/<span class="nodeTag">', 
                    node.nodeName.toLowerCase(), '&gt;</span></div>');
            }
            else
                html.push('/&gt;</div>');
        }
        else if (node.nodeType == 3)
        {
            html.push('<div class="nodeText">', escapeHTML(node.nodeValue),
                '</div>');
        }
    },
    
    appendArray: function(object, html)
    {
        html.push('<span class="objectBox-array"><b>[</b> ');
        
        for (var i = 0, l = object.length, obj; i < l; ++i)
        {
            appendObject(object[i], html);
            
            if (i < l-1)
            html.push(', ');
        }
    
        html.push(' <b>]</b></span>');
    }

});



/*
From firebug


    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Reps

    registerRep: function()
    {
        reps.push.apply(reps, arguments);
    },

    setDefaultRep: function(rep)
    {
        defaultRep = rep;
    },


    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Reps

    getRep: function(object)
    {
        var type = typeof(object);
        for (var i = 0; i < reps.length; ++i)
        {
            var rep = reps[i];
            try
            {
                if (rep.supportsObject(object, type))
                    return rep;
            }
            catch (exc)
            {
                if (FBTrace.dumpProperties)
                {
                    FBTrace.dumpProperties("firebug.getRep FAILS at i/reps.length: "+i+"/"+reps.length+" type:"+type+" exc:", exc);
                    FBTrace.dumpProperties("firebug.getRep reps[i]", reps[i]);
                    FBTrace.dumpStack("firebug.getRep");
                }
            }
        }

        return defaultRep;
    },

    getRepObject: function(node)
    {
        var target = null;
        for (var child = node; child; child = child.parentNode)
        {
            if (hasClass(child, "repTarget"))
                target = child;

            if (child.repObject)
            {
                if (!target && hasClass(child, "repIgnore"))
                    break;
                else
                    return child.repObject;
            }
        }
    },

    getRepNode: function(node)
    {
        for (var child = node; child; child = child.parentNode)
        {
            if (child.repObject)
                return child;
        }
    },

    getElementByRepObject: function(element, object)
    {
        for (var child = element.firstChild; child; child = child.nextSibling)
        {
            if (child.repObject == object)
                return child;
        }
    },
/**/


// ************************************************************************************************
}});

FBL.ns(function() { with (FBL) {
// ************************************************************************************************

/*
 * Sizzle CSS Selector Engine - v0.9
 *  Copyright 2009, John Resig (http://ejohn.org/)
 *  released under the MIT License
 */

var chunker = /((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^[\]]+\]|[^[\]]+)+\]|\\.|[^ >+~,(\[]+)+|[>+~])(\s*,\s*)?/g;

var done = 0;

var Sizzle = function(selector, context, results, seed) {
  var doCache = !results;
  results = results || [];
  context = context || document;

  if ( context.nodeType !== 1 && context.nodeType !== 9 )
    return [];
  
  if ( !selector || typeof selector !== "string" ) {
    return results;
  }

  var parts = [], m, set, checkSet, check, mode, extra;
  
  // Reset the position of the chunker regexp (start from head)
  chunker.lastIndex = 0;
  
  while ( (m = chunker.exec(selector)) !== null ) {
    parts.push( m[1] );
    
    if ( m[2] ) {
      extra = RegExp.rightContext;
      break;
    }
  }

  if ( parts.length > 1 && Expr.match.POS.exec( selector ) ) {
    if ( parts.length === 2 && Expr.relative[ parts[0] ] ) {
      var later = "", match;

      // Position selectors must be done after the filter
      while ( (match = Expr.match.POS.exec( selector )) ) {
        later += match[0];
        selector = selector.replace( Expr.match.POS, "" );
      }

      set = Sizzle.filter( later, Sizzle( selector, context ) );
    } else {
      set = Expr.relative[ parts[0] ] ?
        [ context ] :
        Sizzle( parts.shift(), context );

      while ( parts.length ) {
        var tmpSet = [];

        selector = parts.shift();
        if ( Expr.relative[ selector ] )
          selector += parts.shift();

        for ( var i = 0, l = set.length; i < l; i++ ) {
          Sizzle( selector, set[i], tmpSet );
        }

        set = tmpSet;
      }
    }
  } else {
    var ret = seed ?
      { expr: parts.pop(), set: makeArray(seed) } :
      Sizzle.find( parts.pop(), parts.length === 1 && context.parentNode ? context.parentNode : context );
    set = Sizzle.filter( ret.expr, ret.set );

    if ( parts.length > 0 ) {
      checkSet = makeArray(set);
    }

    while ( parts.length ) {
      var cur = parts.pop(), pop = cur;

      if ( !Expr.relative[ cur ] ) {
        cur = "";
      } else {
        pop = parts.pop();
      }

      if ( pop == null ) {
        pop = context;
      }

      Expr.relative[ cur ]( checkSet, pop );
    }
  }

  if ( !checkSet ) {
    checkSet = set;
  }

  if ( !checkSet ) {
    throw "Syntax error, unrecognized expression: " + (cur || selector);
  }

  if ( checkSet instanceof Array ) {
    if ( context.nodeType === 1 ) {
      for ( var i = 0; checkSet[i] != null; i++ ) {
        if ( checkSet[i] && (checkSet[i] === true || checkSet[i].nodeType === 1 && contains(context, checkSet[i])) ) {
          results.push( set[i] );
        }
      }
    } else {
      for ( var i = 0; checkSet[i] != null; i++ ) {
        if ( checkSet[i] && checkSet[i].nodeType === 1 ) {
          results.push( set[i] );
        }
      }
    }
  } else {
    makeArray( checkSet, results );
  }

  if ( extra ) {
    Sizzle( extra, context, results );
  }

  return results;
};

Sizzle.matches = function(expr, set){
  return Sizzle(expr, null, null, set);
};

Sizzle.find = function(expr, context){
  var set, match;

  if ( !expr ) {
    return [];
  }

  var later = "", match;

  // Pseudo-selectors could contain other selectors (like :not)
  while ( (match = Expr.match.PSEUDO.exec( expr )) ) {
    var left = RegExp.leftContext;

    if ( left.substr( left.length - 1 ) !== "\\" ) {
      later += match[0];
      expr = expr.replace( Expr.match.PSEUDO, "" );
    } else {
      // TODO: Need a better solution, fails: .class\:foo:realfoo(#id)
      break;
    }
  }

  for ( var i = 0, l = Expr.order.length; i < l; i++ ) {
    var type = Expr.order[i];
    
    if ( (match = Expr.match[ type ].exec( expr )) ) {
      var left = RegExp.leftContext;

      if ( left.substr( left.length - 1 ) !== "\\" ) {
        match[1] = (match[1] || "").replace(/\\/g, "");
        set = Expr.find[ type ]( match, context );

        if ( set != null ) {
          expr = expr.replace( Expr.match[ type ], "" );
          break;
        }
      }
    }
  }

  if ( !set ) {
    set = context.getElementsByTagName("*");
  }

  expr += later;

  return {set: set, expr: expr};
};

Sizzle.filter = function(expr, set, inplace){
  var old = expr, result = [], curLoop = set, match;

  while ( expr && set.length ) {
    for ( var type in Expr.filter ) {
      if ( (match = Expr.match[ type ].exec( expr )) != null ) {
        var anyFound = false, filter = Expr.filter[ type ], goodArray = null;

        if ( curLoop == result ) {
          result = [];
        }

        if ( Expr.preFilter[ type ] ) {
          match = Expr.preFilter[ type ]( match, curLoop );

          if ( match[0] === true ) {
            goodArray = [];
            var last = null, elem;
            for ( var i = 0; (elem = curLoop[i]) !== undefined; i++ ) {
              if ( elem && last !== elem ) {
                goodArray.push( elem );
                last = elem;
              }
            }
          }

        }

        var goodPos = 0, found, item;

        for ( var i = 0; (item = curLoop[i]) !== undefined; i++ ) {
          if ( item ) {
            if ( goodArray && item != goodArray[goodPos] ) {
              goodPos++;
            }

            found = filter( item, match, goodPos, goodArray );
            if ( inplace && found != null ) {
              curLoop[i] = found ? curLoop[i] : false;
              if ( found ) {
                anyFound = true;
              }
            } else if ( found ) {
              result.push( item );
              anyFound = true;
            }
          }
        }

        if ( found !== undefined ) {
          if ( !inplace ) {
            curLoop = result;
          }

          expr = expr.replace( Expr.match[ type ], "" );

          if ( !anyFound ) {
            return [];
          }

          break;
        }
      }
    }


    expr = expr.replace(/\s*,\s*/, "");

    // Improper expression
    if ( expr == old ) {
      throw "Syntax error, unrecognized expression: " + expr;
    }

    old = expr;
  }

  return curLoop;
};

var Expr = Sizzle.selectors = {
  order: [ "ID", "NAME", "TAG" ],
  match: {
    ID: /#((?:[\w\u0128-\uFFFF_-]|\\.)+)/,
    CLASS: /\.((?:[\w\u0128-\uFFFF_-]|\\.)+)/,
    NAME: /\[name=((?:[\w\u0128-\uFFFF_-]|\\.)+)\]/,
    ATTR: /\[((?:[\w\u0128-\uFFFF_-]|\\.)+)\s*(?:(\S{0,1}=)\s*(['"]*)(.*?)\3|)\]/,
    TAG: /^((?:[\w\u0128-\uFFFF\*_-]|\\.)+)/,
    CHILD: /:(only|nth|last|first)-child\(?(even|odd|[\dn+-]*)\)?/,
    POS: /:(nth|eq|gt|lt|first|last|even|odd)\(?(\d*)\)?(?:[^-]|$)/,
    PSEUDO: /:((?:[\w\u0128-\uFFFF_-]|\\.)+)(?:\((['"]*)((?:\([^\)]+\)|[^\2\(\)]*)+)\2\))?/
  },
  attrMap: {
    "class": "className"
  },
  relative: {
    "+": function(checkSet, part){
      for ( var i = 0, l = checkSet.length; i < l; i++ ) {
        var elem = checkSet[i];
        if ( elem ) {
          var cur = elem.previousSibling;
          while ( cur && cur.nodeType !== 1 ) {
            cur = cur.previousSibling;
          }
          checkSet[i] = typeof part === "string" ?
            cur || false :
            cur === part;
        }
      }

      if ( typeof part === "string" ) {
        Sizzle.filter( part, checkSet, true );
      }
    },
    ">": function(checkSet, part){
      if ( typeof part === "string" && !/\W/.test(part) ) {
        part = part.toUpperCase();

        for ( var i = 0, l = checkSet.length; i < l; i++ ) {
          var elem = checkSet[i];
          if ( elem ) {
            var parent = elem.parentNode;
            checkSet[i] = parent.nodeName === part ? parent : false;
          }
        }
      } else {
        for ( var i = 0, l = checkSet.length; i < l; i++ ) {
          var elem = checkSet[i];
          if ( elem ) {
            checkSet[i] = typeof part === "string" ?
              elem.parentNode :
              elem.parentNode === part;
          }
        }

        if ( typeof part === "string" ) {
          Sizzle.filter( part, checkSet, true );
        }
      }
    },
    "": function(checkSet, part){
      var doneName = "done" + (done++), checkFn = dirCheck;

      if ( !part.match(/\W/) ) {
        var nodeCheck = part = part.toUpperCase();
        checkFn = dirNodeCheck;
      }

      checkFn("parentNode", part, doneName, checkSet, nodeCheck);
    },
    "~": function(checkSet, part){
      var doneName = "done" + (done++), checkFn = dirCheck;

      if ( typeof part === "string" && !part.match(/\W/) ) {
        var nodeCheck = part = part.toUpperCase();
        checkFn = dirNodeCheck;
      }

      checkFn("previousSibling", part, doneName, checkSet, nodeCheck);
    }
  },
  find: {
    ID: function(match, context){
      if ( context.getElementById ) {
        var m = context.getElementById(match[1]);
        return m ? [m] : [];
      }
    },
    NAME: function(match, context){
      return context.getElementsByName(match[1]);
    },
    TAG: function(match, context){
      return context.getElementsByTagName(match[1]);
    }
  },
  preFilter: {
    CLASS: function(match){
      return new RegExp( "(?:^|\\s)" + match[1] + "(?:\\s|$)" );
    },
    ID: function(match){
      return match[1];
    },
    TAG: function(match){
      return match[1].toUpperCase();
    },
    CHILD: function(match){
      if ( match[1] == "nth" ) {
        // parse equations like 'even', 'odd', '5', '2n', '3n+2', '4n-1', '-n+6'
        var test = /(-?)(\d*)n((?:\+|-)?\d*)/.exec(
          match[2] == "even" && "2n" || match[2] == "odd" && "2n+1" ||
          !/\D/.test( match[2] ) && "0n+" + match[2] || match[2]);

        // calculate the numbers (first)n+(last) including if they are negative
        match[2] = (test[1] + (test[2] || 1)) - 0;
        match[3] = test[3] - 0;
      }

      // TODO: Move to normal caching system
      match[0] = "done" + (done++);

      return match;
    },
    ATTR: function(match){
      var name = match[1];
      
      if ( Expr.attrMap[name] ) {
        match[1] = Expr.attrMap[name];
      }

      if ( match[2] === "~=" ) {
        match[4] = " " + match[4] + " ";
      }

      return match;
    },
    PSEUDO: function(match){
      if ( match[1] === "not" ) {
        match[3] = match[3].split(/\s*,\s*/);
      }
      
      return match;
    },
    POS: function(match){
      match.unshift( true );
      return match;
    }
  },
  filters: {
    enabled: function(elem){
      return elem.disabled === false && elem.type !== "hidden";
    },
    disabled: function(elem){
      return elem.disabled === true;
    },
    checked: function(elem){
      return elem.checked === true;
    },
    selected: function(elem){
      // Accessing this property makes selected-by-default
      // options in Safari work properly
      elem.parentNode.selectedIndex;
      return elem.selected === true;
    },
    parent: function(elem){
      return !!elem.firstChild;
    },
    empty: function(elem){
      return !elem.firstChild;
    },
    has: function(elem, i, match){
      return !!Sizzle( match[3], elem ).length;
    },
    header: function(elem){
      return /h\d/i.test( elem.nodeName );
    },
    text: function(elem){
      return "text" === elem.type;
    },
    radio: function(elem){
      return "radio" === elem.type;
    },
    checkbox: function(elem){
      return "checkbox" === elem.type;
    },
    file: function(elem){
      return "file" === elem.type;
    },
    password: function(elem){
      return "password" === elem.type;
    },
    submit: function(elem){
      return "submit" === elem.type;
    },
    image: function(elem){
      return "image" === elem.type;
    },
    reset: function(elem){
      return "reset" === elem.type;
    },
    button: function(elem){
      return "button" === elem.type || elem.nodeName.toUpperCase() === "BUTTON";
    },
    input: function(elem){
      return /input|select|textarea|button/i.test(elem.nodeName);
    }
  },
  setFilters: {
    first: function(elem, i){
      return i === 0;
    },
    last: function(elem, i, match, array){
      return i === array.length - 1;
    },
    even: function(elem, i){
      return i % 2 === 0;
    },
    odd: function(elem, i){
      return i % 2 === 1;
    },
    lt: function(elem, i, match){
      return i < match[3] - 0;
    },
    gt: function(elem, i, match){
      return i > match[3] - 0;
    },
    nth: function(elem, i, match){
      return match[3] - 0 == i;
    },
    eq: function(elem, i, match){
      return match[3] - 0 == i;
    }
  },
  filter: {
    CHILD: function(elem, match){
      var type = match[1], parent = elem.parentNode;

      var doneName = match[0];
      
      if ( parent && !parent[ doneName ] ) {
        var count = 1;

        for ( var node = parent.firstChild; node; node = node.nextSibling ) {
          if ( node.nodeType == 1 ) {
            node.nodeIndex = count++;
          }
        }

        parent[ doneName ] = count - 1;
      }

      if ( type == "first" ) {
        return elem.nodeIndex == 1;
      } else if ( type == "last" ) {
        return elem.nodeIndex == parent[ doneName ];
      } else if ( type == "only" ) {
        return parent[ doneName ] == 1;
      } else if ( type == "nth" ) {
        var add = false, first = match[2], last = match[3];

        if ( first == 1 && last == 0 ) {
          return true;
        }

        if ( first == 0 ) {
          if ( elem.nodeIndex == last ) {
            add = true;
          }
        } else if ( (elem.nodeIndex - last) % first == 0 && (elem.nodeIndex - last) / first >= 0 ) {
          add = true;
        }

        return add;
      }
    },
    PSEUDO: function(elem, match, i, array){
      var name = match[1], filter = Expr.filters[ name ];

      if ( filter ) {
        return filter( elem, i, match, array )
      } else if ( name === "contains" ) {
        return (elem.textContent || elem.innerText || "").indexOf(match[3]) >= 0;
      } else if ( name === "not" ) {
        var not = match[3];

        for ( var i = 0, l = not.length; i < l; i++ ) {
          if ( Sizzle.filter(not[i], [elem]).length > 0 ) {
            return false;
          }
        }

        return true;
      }
    },
    ID: function(elem, match){
      return elem.nodeType === 1 && elem.getAttribute("id") === match;
    },
    TAG: function(elem, match){
      return (match === "*" && elem.nodeType === 1) || elem.nodeName === match;
    },
    CLASS: function(elem, match){
      return match.test( elem.className );
    },
    ATTR: function(elem, match){
      var result = elem[ match[1] ] || elem.getAttribute( match[1] ), value = result + "", type = match[2], check = match[4];
      return result == null ?
        false :
        type === "=" ?
        value === check :
        type === "*=" ?
        value.indexOf(check) >= 0 :
        type === "~=" ?
        (" " + value + " ").indexOf(check) >= 0 :
        !match[4] ?
        result :
        type === "!=" ?
        value != check :
        type === "^=" ?
        value.indexOf(check) === 0 :
        type === "$=" ?
        value.substr(value.length - check.length) === check :
        type === "|=" ?
        value === check || value.substr(0, check.length + 1) === check + "-" :
        false;
    },
    POS: function(elem, match, i, array){
      var name = match[2], filter = Expr.setFilters[ name ];

      if ( filter ) {
        return filter( elem, i, match, array );
      }
    }
  }
};

var makeArray = function(array, results) {
  array = Array.prototype.slice.call( array );

  if ( results ) {
    results.push.apply( results, array );
    return results;
  }
  
  return array;
};

// Perform a simple check to determine if the browser is capable of
// converting a NodeList to an array using builtin methods.
try {
  Array.prototype.slice.call( document.documentElement.childNodes );

// Provide a fallback method if it does not work
} catch(e){
  makeArray = function(array, results) {
    var ret = results || [];

    if ( array instanceof Array ) {
      Array.prototype.push.apply( ret, array );
    } else {
      if ( typeof array.length === "number" ) {
        for ( var i = 0, l = array.length; i < l; i++ ) {
          ret.push( array[i] );
        }
      } else {
        for ( var i = 0; array[i]; i++ ) {
          ret.push( array[i] );
        }
      }
    }

    return ret;
  };
}

// Check to see if the browser returns elements by name when
// querying by getElementById (and provide a workaround)
(function(){
  // We're going to inject a fake input element with a specified name
  var form = document.createElement("form"),
    id = "script" + (new Date).getTime();
  form.innerHTML = "<input name='" + id + "'/>";

  // Inject it into the root element, check its status, and remove it quickly
  var root = document.documentElement;
  root.insertBefore( form, root.firstChild );

  // The workaround has to do additional checks after a getElementById
  // Which slows things down for other browsers (hence the branching)
  if ( !!document.getElementById( id ) ) {
    Expr.find.ID = function(match, context){
      if ( context.getElementById ) {
        var m = context.getElementById(match[1]);
        return m ? m.id === match[1] || m.getAttributeNode && m.getAttributeNode("id").nodeValue === match[1] ? [m] : undefined : [];
      }
    };

    Expr.filter.ID = function(elem, match){
      var node = elem.getAttributeNode && elem.getAttributeNode("id");
      return elem.nodeType === 1 && node && node.nodeValue === match;
    };
  }

  root.removeChild( form );
})();

// Check to see if the browser returns only elements
// when doing getElementsByTagName("*")
(function(){
  // Create a fake element
  var div = document.createElement("div");
  div.appendChild( document.createComment("") );

  // Make sure no comments are found
  if ( div.getElementsByTagName("*").length > 0 ) {
    Expr.find.TAG = function(match, context){
      var results = context.getElementsByTagName(match[1]);

      // Filter out possible comments
      if ( match[1] === "*" ) {
        var tmp = [];

        for ( var i = 0; results[i]; i++ ) {
          if ( results[i].nodeType === 1 ) {
            tmp.push( results[i] );
          }
        }

        results = tmp;
      }

      return results;
    };
  }
})();

if ( document.querySelectorAll ) (function(){
  var oldSizzle = Sizzle;
  
  Sizzle = function(query, context, extra){
    context = context || document;

    if ( context.nodeType === 9 ) {
      try {
        return makeArray( context.querySelectorAll(query) );
      } catch(e){}
    }
    
    return oldSizzle(query, context, extra);
  };

  Sizzle.find = oldSizzle.find;
  Sizzle.filter = oldSizzle.filter;
  Sizzle.selectors = oldSizzle.selectors;
})();

if ( document.documentElement.getElementsByClassName ) {
  Expr.order.splice(1, 0, "CLASS");
  Expr.find.CLASS = function(match, context) {
    return context.getElementsByClassName(match[1]);
  };
}

function dirNodeCheck( dir, cur, doneName, checkSet, nodeCheck ) {
  for ( var i = 0, l = checkSet.length; i < l; i++ ) {
    var elem = checkSet[i];
    if ( elem ) {
      elem = elem[dir]
      var match = false;

      while ( elem && elem.nodeType ) {
        var done = elem[doneName];
        if ( done ) {
          match = checkSet[ done ];
          break;
        }

        if ( elem.nodeType === 1 )
          elem[doneName] = i;

        if ( elem.nodeName === cur ) {
          match = elem;
          break;
        }

        elem = elem[dir];
      }

      checkSet[i] = match;
    }
  }
}

function dirCheck( dir, cur, doneName, checkSet, nodeCheck ) {
  for ( var i = 0, l = checkSet.length; i < l; i++ ) {
    var elem = checkSet[i];
    if ( elem ) {
      elem = elem[dir]
      var match = false;

      while ( elem && elem.nodeType ) {
        if ( elem[doneName] ) {
          match = checkSet[ elem[doneName] ];
          break;
        }

        if ( elem.nodeType === 1 ) {
          elem[doneName] = i;

          if ( typeof cur !== "string" ) {
            if ( elem === cur ) {
              match = true;
              break;
            }

          } else if ( Sizzle.filter( cur, [elem] ).length > 0 ) {
            match = elem;
            break;
          }
        }

        elem = elem[dir];
      }

      checkSet[i] = match;
    }
  }
}

var contains = document.compareDocumentPosition ?  function(a, b){
  return a.compareDocumentPosition(b) & 16;
} : function(a, b){
  return a !== b && a.contains(b);
};

// EXPOSE

Firebug.Selector = Sizzle;

// ************************************************************************************************
}});

FBL.ns(function() { with (FBL) {
// ************************************************************************************************


// ************************************************************************************************
// Console

extend(ConsoleAPI,
{
    log: function()
    {
        return logFormatted(arguments, "");
    },
    
    debug: function()
    {
        return logFormatted(arguments, "debug");
    },
    
    info: function()
    {
        return logFormatted(arguments, "info");
    },
    
    warn: function()
    {
        return logFormatted(arguments, "warning");
    },
    
    error: function()
    {
        return logFormatted(arguments, "error");
    },
    
    assert: function(truth, message)
    {
        if (!truth)
        {
            var args = [];
            for (var i = 1; i < arguments.length; ++i)
                args.push(arguments[i]);
            
            logFormatted(args.length ? args : ["Assertion Failure"], "error");
            throw message ? message : "Assertion Failure";
        }
        return Console.logID;        
    },
    
    dir: function(object)
    {
        var html = [];
                    
        var pairs = [];
        for (var name in object)
        {
            try
            {
                pairs.push([name, object[name]]);
            }
            catch (exc)
            {
            }
        }
        
        pairs.sort(function(a, b) { return a[0] < b[0] ? -1 : 1; });
        
        html.push('<div class="log-object">');
        for (var i = 0; i < pairs.length; ++i)
        {
            var name = pairs[i][0], value = pairs[i][1];
            
            html.push('<div class="property">', 
                '<div class="propertyValueCell"><span class="propertyValue">');
                
            appendObject(value, html);
            
            html.push('</span></div><div class="propertyNameCell"><span class="propertyName">',
                escapeHTML(name), '</span></div>'); 
            
            html.push('</div>');
        }
        html.push('</div>');
        
        return logRow(html, "dir");
    },
    
    old_dir: function(object)
    {
        var html = [];
                    
        var pairs = [];
        for (var name in object)
        {
            try
            {
                pairs.push([name, object[name]]);
            }
            catch (exc)
            {
            }
        }
        
        pairs.sort(function(a, b) { return a[0] < b[0] ? -1 : 1; });
        
        html.push('<table>');
        for (var i = 0; i < pairs.length; ++i)
        {
            var name = pairs[i][0], value = pairs[i][1];
            
            html.push('<tr>', 
            '<td class="propertyNameCell"><span class="propertyName">',
                escapeHTML(name), '</span></td>', '<td><span class="propertyValue">');
                
            appendObject(value, html);
            html.push('</span></td></tr>');
        }
        html.push('</table>');
        
        return logRow(html, "dir");
    },
    
    dirxml: function(node)
    {
        var html = [];
        
        appendNode(node, html);
        return logRow(html, "dirxml");
    },
    
    group: function()
    {
        return logRow(arguments, "group", pushGroup);
    },
    
    groupEnd: function()
    {
        return logRow(arguments, "", popGroup);
    },
    
    time: function(name)
    {
        timeMap[name] = (new Date()).getTime();
        return Console.logID;
    },
    
    timeEnd: function(name)
    {
        if (name in timeMap)
        {
            var delta = (new Date()).getTime() - timeMap[name];
            logFormatted([name+ ":", delta+"ms"]);
            delete timeMap[name];
        }
        return Console.logID;
    },
    
    count: function()
    {
        return this.warn(["count() not supported."]);
    },
    
    trace: function()
    {
        return this.warn(["trace() not supported."]);
    },
    
    profile: function()
    {
        return this.warn(["profile() not supported."]);
    },
    
    profileEnd: function()
    {
        return Console.logID;
    },
    
    clear: function()
    {
        consoleBody.innerHTML = "";
        return Console.logID;
    },

    open: function()
    {
        toggleConsole(true);
        return Console.logID;
    },
    
    close: function()
    {
        if (frameVisible)
            toggleConsole();
        return Console.logID;
    }
});


// ********************************************************************************************

var consoleFrame = null;
var consoleBody = null;
var commandLine = null;

var frameVisible = false;
var messageQueue = [];
var groupStack = [];
var timeMap = {};

var clPrefix = ">>> ";

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *



// ************************************************************************************************
// Console Module

var Console = Firebug.Console = inherit(ConsoleAPI,
{

    logID: "(_____FIREBUG_LOG_____)",

    
    returnDir: function(object)
    {
        var html = [];
                    
        var pairs = [];
        for (var name in object)
        {
            try
            {
                pairs.push([name, object[name]]);
            }
            catch (exc)
            {
            }
        }
        
        pairs.sort(function(a, b) { return a[0] < b[0] ? -1 : 1; });
        
        html.push('<table>');
        for (var i = 0; i < pairs.length; ++i)
        {
            var name = pairs[i][0], value = pairs[i][1];
            
            html.push('<tr>', 
            '<td class="propertyNameCell"><span class="propertyName">',
                escapeHTML(name), '</span></td>', '<td><span class="propertyValue">');
                
            appendObject(value, html);
            html.push('</span></td></tr>');
        }
        html.push('</table>');
        
        return html;
    }
});
    



// ********************************************************************************************

function focusCommandLine()
{
    toggleConsole(true);
    if (commandLine)
        commandLine.focus();
};

function evalCommandLine()
{
    var text = commandLine.value;
    commandLine.value = "";

    logRow([clPrefix, text], "command");
    
    var value;
    try
    {
        value = eval(text);
    }
    catch (exc)
    {
    }

    console.log(value);
};

FBL.logRow = function(message, className, handler)
{
    if (consoleBody)
        writeMessage(message, className, handler);
    else
    {
        messageQueue.push([message, className, handler]);
        waitForDocument();
    }
    
    return Console.logID;
};

FBL.flush = function()
{
    var queue = messageQueue;
    messageQueue = [];
    
    for (var i = 0; i < queue.length; ++i)
        writeMessage(queue[i][0], queue[i][1], queue[i][2]);
};

FBL.writeMessage = function(message, className, handler)
{
    //var consoleFrame = consoleBodyFrame.offsetParent; 
    var consoleFrame = consoleBodyFrame; 
    var isScrolledToBottom =
        consoleFrame.scrollTop + consoleFrame.offsetHeight >= consoleFrame.scrollHeight;

    if (!handler)
        handler = writeRow;
    
    handler(message, className);
    
    if (isScrolledToBottom)
        consoleFrame.scrollTop = consoleFrame.scrollHeight - consoleFrame.offsetHeight;
};

FBL.appendRow = function(row)
{
    var container = groupStack.length ? groupStack[groupStack.length-1] : consoleBody;
    container.appendChild(row);
};

FBL.writeRow = function(message, className)
{
    var row = consoleBody.ownerDocument.createElement("div");
    row.className = "logRow" + (className ? " logRow-"+className : "");
    row.innerHTML = message.join("");
    appendRow(row);
};

FBL.pushGroup = function(message, className)
{
    logFormatted(message, className);

    var groupRow = consoleBody.ownerDocument.createElement("div");
    groupRow.className = "logGroup";
    var groupRowBox = consoleBody.ownerDocument.createElement("div");
    groupRowBox.className = "logGroupBox";
    groupRow.appendChild(groupRowBox);
    appendRow(groupRowBox);
    groupStack.push(groupRowBox);
};

FBL.popGroup = function()
{
    groupStack.pop();
};

// ********************************************************************************************

FBL.logFormatted = function(objects, className)
{
    var html = [];

    var format = objects[0];
    var objIndex = 0;

    if (typeof(format) != "string")
    {
        format = "";
        objIndex = -1;
    }

    var parts = parseFormat(format);
    for (var i = 0; i < parts.length; ++i)
    {
        var part = parts[i];
        if (part && typeof(part) == "object")
        {
            var object = objects[++objIndex];
            part.appender(object, html);
        }
        else
            appendText(part, html);
    }

    for (var i = objIndex+1; i < objects.length; ++i)
    {
        appendText(" ", html);
        
        var object = objects[i];
        if (typeof(object) == "string")
            appendText(object, html);
        else
            appendObject(object, html);
    }
    
    return logRow(html, className);    
};

FBL.parseFormat = function(format)
{
    var parts = [];

    var reg = /((^%|[^\\]%)(\d+)?(\.)([a-zA-Z]))|((^%|[^\\]%)([a-zA-Z]))/;    
    var appenderMap = {s: appendText, d: appendInteger, i: appendInteger, f: appendFloat};

    for (var m = reg.exec(format); m; m = reg.exec(format))
    {
        var type = m[8] ? m[8] : m[5];
        var appender = type in appenderMap ? appenderMap[type] : appendObject;
        var precision = m[3] ? parseInt(m[3]) : (m[4] == "." ? -1 : 0);

        parts.push(format.substr(0, m[0][0] == "%" ? m.index : m.index+1));
        parts.push({appender: appender, precision: precision});

        format = format.substr(m.index+m[0].length);
    }

    parts.push(format);

    return parts;
};

FBL.objectToString = function(object)
{
    try
    {
        return object+"";
    }
    catch (exc)
    {
        return null;
    }
};

// ********************************************************************************************
FBL.onError = function(msg, href, lineNo)
{
    var html = [];
    
    var lastSlash = href.lastIndexOf("/");
    var fileName = lastSlash == -1 ? href : href.substr(lastSlash+1);
    
    html.push(
        '<span class="errorMessage">', msg, '</span>', 
        '<div class="objectBox-sourceLink">', fileName, ' (line ', lineNo, ')</div>'
    );
    
    logRow(html, "error");
};


// ************************************************************************************************
}});

FBL.ns(function() { with (FBL) {
// ************************************************************************************************

var Console = Firebug.Console;


// ************************************************************************************************
// CommandLine

var CommandLine = Firebug.CommandLine = 
{
    _cmdElement: null,
  
    _buffer: [],
    _bi: -1,
    
    _completing: null,
    _completePrefix: null,
    _completeExpr: null,
    _completeBuffer: null,
    _ci: null,
    
    _completion:
    {
        window:
        [
            "console"
        ],
        
        document:
        [
            "getElementById", 
            "getElementsByTagName"
        ]
    },
  
    _stack: function(command)
    {
        this._buffer.push(command);
        this._bi = this._buffer.length;
    },
    
    initialize: function(doc)
    {
        initializeCommandLineAPI();

        this._cmdElement = doc.getElementById("commandLine");
        
        addEvent(this._cmdElement, "keydown", this.onKeyDown);
        window.onerror = this.onError;
    },

    execute: function()
    {
        var cmd = this._cmdElement;
        var command = cmd.value;
        
        this._stack(command);
        writeMessage(['<span>&gt;&gt;&gt;</span> ',command], "command");
        
        try
        {
            
            var result = this.evaluate(command);
            // evita que seja repetido o log, caso o comando executado
            // j� seja um log via linha de comando
            if (result != Console.logID)
            {
                var html = [];
                appendObject(result, html)
                writeMessage(html, "command");
            }
                
        }
        catch (e)
        {
            writeMessage([e.message || e], "error");
        }
        
        cmd.value = "";
    },
    
    evaluate: function(expr)
    {
      //var cmd = "with(window){ (function() { return " + expr + " \n}).apply(window); }";
      var cmd = "(function() { with(FBL.CommandLineAPI){ return " + expr + " } }).apply(window)";
      return this.eval(cmd);
    },
    
    eval: new Function("return window.eval.apply(window, arguments)"),
    
    prevCommand: function()
    {
        var cmd = this._cmdElement;
        var buffer = this._buffer;
        
        if (this._bi > 0 && buffer.length > 0)
            cmd.value = buffer[--this._bi];
    },
  
    nextCommand: function()
    {
        var cmd = this._cmdElement;
        
        var buffer = this._buffer;
        var limit = buffer.length -1;
        var i = this._bi;
        
        if (i < limit)
          cmd.value = buffer[++this._bi];
          
        else if (i == limit)
        {
            ++this._bi;
            cmd.value = "";
        }
    },
  
    autocomplete: function(reverse)
    {
        var cmd = this._cmdElement;
        
        var command = cmd.value;
        var offset = getExpressionOffset(command);

        var valBegin = offset ? command.substr(0, offset) : "";
        var val = command.substr(offset);
        
        var buffer, obj, objName, commandBegin, result, prefix;
        
        // if it is the beginning of the completion
        if(!this._completing)
        {
            
            // group1 - command begin
            // group2 - base object
            // group3 - property prefix
            var reObj = /(.*[^_$\w\d\.])?((?:[_$\w][_$\w\d]*\.)*)([_$\w][_$\w\d]*)?$/;
            var r = reObj.exec(val);
            
            // parse command
            if (r[1] || r[2] || r[3])
            {
                commandBegin = r[1] || "";
                objName = r[2] || "";
                prefix = r[3] || "";
            }
            else if (val == "")
            {
                commandBegin = objName = prefix = "";
            } else
                return;
            
            this._completing = true;
      
            // find base object
            if(objName == "")
                obj = window;
              
            else
            {
                objName = objName.replace(/\.$/, "");
        
                var n = objName.split(".");
                var target = window, o;
                
                for (var i=0, ni; ni = n[i]; i++)
                {
                    if (o = target[ni])
                      target = o;
                      
                    else
                    {
                        target = null;
                        break;
                    }
                }
                obj = target;
            }
            
            // map base object
            if(obj)
            {
                this._completePrefix = prefix;
                this._completeExpr = valBegin + commandBegin + (objName ? objName + "." : "");
                this._ci = -1;
                
                buffer = this._completeBuffer = isIE ?
                    this._completion[objName || "window"] || [] : [];
                
                for(var p in obj)
                    buffer.push(p);
            }
    
        // if it is the continuation of the last completion
        } else
          buffer = this._completeBuffer;
        
        if (buffer)
        {
            prefix = this._completePrefix;
            
            var diff = reverse ? -1 : 1;
            
            for(var i=this._ci+diff, l=buffer.length, bi; i>=0 && i<l; i+=diff)
            {
                bi = buffer[i];
                
                if (bi.indexOf(prefix) == 0)
                {
                    this._ci = i;
                    result = bi;
                    break;
                }
            }
        }
        
        if (result)
            cmd.value = this._completeExpr + result;
    },
    
    onError: function(msg, href, lineNo)
    {
        var html = [];
        
        var lastSlash = href.lastIndexOf("/");
        var fileName = lastSlash == -1 ? href : href.substr(lastSlash+1);
        
        html.push(
            '<span class="errorMessage">', msg, '</span>', 
            '<div class="objectBox-sourceLink">', fileName, ' (line ', lineNo, ')</div>'
          );
        
        writeRow(html, "error");
    },
    
    clear: function()
    {
        CommandLine._cmdElement.value = "";
    },
    
    onKeyDown: function(e)
    {
        e = e || event;
        
        var code = e.keyCode;
        
        /*tab, shift, control, alt*/
        if (code != 9 && code != 16 && code != 17 && code != 18)
            CommandLine._completing = false;
    
        if (code == 13 /* enter */)
            CommandLine.execute();

        else if (code == 27 /* ESC */)
            setTimeout(CommandLine.clear, 0);
          
        else if (code == 38 /* up */)
            CommandLine.prevCommand();
          
        else if (code == 40 /* down */)
            CommandLine.nextCommand();
          
        else if (code == 9 /* tab */)
            CommandLine.autocomplete(e.shiftKey);
          
        else
            return;
        
        cancelEvent(e, true);
        return false;
    }
};

Firebug.CommandLine.API =
{
    $: function(id)
    {
        return document.getElementById(id)
    },

    $$: Firebug.Selector,
    
    dir: ConsoleAPI.dir,

    dirxml: ConsoleAPI.dirxml
}

FBL.CommandLineAPI = {};
function initializeCommandLineAPI()
{
    var api = FBL.Firebug.CommandLine.API;
    for (var m in api)
        if (!window[m])
            FBL.CommandLineAPI[m] = api[m];
}
    


/*
OPERA TAB bug
function handleBlur(e) {
  if (this.lastKey == 9)
    this.focus();
}

function handleKeyDown(e) {
  this.lastKey = e.keyCode;
}

function handleFocus(e) {
  this.lastKey = null;
}

window.onload = function() {
  var elm = document.getElementById('myTextarea');
  elm.onfocus = handleFocus;
  elm.onblur = handleBlur;
  elm.onkeydown = handleKeyDown;
};
      
/**/


var reOpenBracket = /[\[\(\{]/;
var reCloseBracket = /[\]\)\}]/;

function getExpressionOffset(command)
{
    // XXXjoe This is kind of a poor-man's JavaScript parser - trying
    // to find the start of the expression that the cursor is inside.
    // Not 100% fool proof, but hey...

    var bracketCount = 0;

    var start = command.length-1;
    for (; start >= 0; --start)
    {
        var c = command[start];
        if ((c == "," || c == ";" || c == " ") && !bracketCount)
            break;
        if (reOpenBracket.test(c))
        {
            if (bracketCount)
                --bracketCount;
            else
                break;
        }
        else if (reCloseBracket.test(c))
            ++bracketCount;
    }

    return start + 1;
}


// ************************************************************************************************
}});

FBL.ns(function() { with (FBL) {
// ************************************************************************************************

/*


TODO: Better handling of switching tab contexts (selectedTab, rightPanelVisible)

TODO: CommandLineAPI --> $, $$, dir, dirxml...

TODO: apply the onGlobalKeyDown handler to the Chrome Frame

TODO: problem when resizing with the vSplitter, when it reaches the side of
      the screen. Problem with negative pixel numbers.

TODO: vSplitter is bigger than the frame in firefox. Problem with mouse scroll.

TODO: problem with the new Firebug for FF3, it seems that it doesn't allow 
      extending the console namespace anymore.
      
TODO: handle disble mouse wheel in IE

TODO: handle disble text selection in IE

TODO: opera problem with the TAB key in commandLine


FIXED: isScrolledToBottom is not working in Firefox, it seems that this is 
      happening because the scrollable panel is some pixels higher than
      it should be.

FIXED: better handling of scope of commandLine.eval(), if you type "this" it will
      refer to the CommandLine module, and it should refer to "window" instead


<script language="JavaScript1.2">

function disabletext(e){
return false
}

function reEnable(){
return true
}

//if the browser is IE4+
document.onselectstart=new Function ("return false")

//if the browser is NS6
if (window.sidebar){
document.onmousedown=disabletext
document.onclick=reEnable
}
</script>




*/

/*



function getXPath(node, path) {
  path = path || [];
  if(node.parentNode) {
    path = getXPath(node.parentNode, path);
  }

  if(node.previousSibling) {
    var count = 1;
    var sibling = node.previousSibling
    do {
      if(sibling.nodeType == 1 && sibling.nodeName == node.nodeName) {count++;}
      sibling = sibling.previousSibling;
    } while(sibling);
    if(count == 1) {count = null;}
  } else if(node.nextSibling) {
    var sibling = node.nextSibling;
    do {
      if(sibling.nodeType == 1 && sibling.nodeName == node.nodeName) {
        var count = 1;
        sibling = null;
      } else {
        var count = null;
        sibling = sibling.previousSibling;
      }
    } while(sibling);
  }

  if(node.nodeType == 1) {
    path.push(node.nodeName.toLowerCase() + (node.id ? "[@id='"+node.id+"']" : count > 0 ? "["+count+"]" : ''));
  }
  return path;
};


// Getting result
document.evaluate("/html/body/div/ul/li[2]", document, null, XPathResult.ANY_TYPE, null ).iterateNext()




*/


// ************************************************************************************************
// Chrome API

extend(ChromeAPI,
{
    close: function()
    {
        var context = Chrome.context;
        
        if (context)
        {
            if (context.element && context.element.opener)
                context.element.close();
                
            if (context.isVisible)
                Chrome.toggle();
        }
    },
    
    detach: function()
    {
        Chrome.toggle(true, true);
    },    
    
    toggleCommandLine: function()
    {
        bottomVisible = !bottomVisible;
        bottom.className = bottomVisible ? "" : "hide";
        
        if (isFirefox)
            setTimeout(Chrome.draw, 0);
            
        frame.focus();
    },
    
    
    toggleRightPanel: function()
    {
        rightPanelVisible = !rightPanelVisible;
        
        bodyR.className = rightPanelVisible ? "" : "hide"; 
        toolbarRFrame.className = rightPanelVisible ? "" : "hide";
         
        if (isIE) 
        {
            if (rightPanelVisible)
                vSplitterStyle.right = 300 + "px";
                
            Chrome.draw();
        }
        
    },
    
    
    showTab: function(tabName)
    {
        if (tabName == 0 && tabName != selectedTab)
        {
            ChromeAPI.toggleRightPanel();
            ChromeAPI.toggleCommandLine();

            selectedTab = 0;
            tabL = consoleL;
            tabLStyle = tabL.style;
            
            consoleL.style.display = "block";
            HTMLL.style.display = "none";
            
            Chrome.doc.getElementById("tc").className = "tab selectedTab";
            Chrome.doc.getElementById("th").className = "tab";

            Chrome.draw();
        }
        else if (tabName == 1 && tabName != selectedTab)
        {
            selectedTab = 1;
            tabL = HTMLL;
            tabLStyle = tabL.style;
            
            HTMLL.style.display = "block";
            consoleL.style.display = "none";

            Chrome.doc.getElementById("tc").className = "tab";
            Chrome.doc.getElementById("th").className = "tab selectedTab";

            ChromeAPI.toggleRightPanel();
            ChromeAPI.toggleCommandLine();

            Chrome.draw();
        }
    },
    
    clear: function()
    {
        ConsoleAPI.clear();
    }
    
});


// ************************************************************************************************
// Chrome Module

var Chrome = Firebug.Chrome = 
{
    chromeHeight: 250,
    interfaceFile: "firebug.html",
    injectedMode: true,
    
    context: null,
    
    onReady: function() {
        addEvent(
            document, 
            isIE || isSafari ? "keydown" : "keypress", 
            onGlobalKeyDown
        );
    },
    
    onChromeReady: function()
    {
        chromeReady = true;
        
        var frame = FBL.frame;
            
        if (Chrome.context == Chrome.Frame)
        {
            Chrome.doc = frame.contentWindow.document;
            Chrome.win = frame.contentWindow.window;
        }
        else
        {
            Chrome.doc = frame.document;
            Chrome.win = frame.window;
        }
        
        Chrome.win.FB = FBL.ChromeAPI;
        
        Chrome.context.onReady(Chrome.doc);
        Chrome.initializeContext(Chrome.doc, Chrome.context);
        
        Chrome.draw();    
    },
    
    
    destroy: function()
    {
        if (Chrome.context == Chrome.Popup)
        {
            Chrome.finalizeContext(Chrome.Popup);

            var last = Chrome.Frame;
            if(last.element)
            {
                Chrome.initializeContext(last.document, last);
                last.isVisible = false;
                frame.style.visibility = "hidden";
            }
              
        }
        else if (Chrome.context == Chrome.Frame)
        {
            chromeReady = false;
            Chrome.finalizeContext(Chrome.Frame);
        }
    },
    
    initializeContext: function(doc, context)
    {
        if (Firebug.CommandLine)
            Firebug.CommandLine.initialize(doc);
            
        this.context = context;
        this.context.document = doc;
        this.doc = doc;
        
        body = doc.getElementById("body");
        cmdLine = doc.getElementById("commandLine");
        header = doc.getElementById("header");
        bottom = doc.getElementById("bottom");
        bodyL = doc.getElementById("bodyL");
        bodyR = doc.getElementById("bodyR");
        hSplitter = doc.getElementById("hSplitter");
        vSplitter = doc.getElementById("vSplitter");
        toolbarRFrame = doc.getElementById("toolbarRFrame");
        toolbarRFrameStyle = toolbarRFrame.style;
        
        vSplitterStyle = vSplitter.style;
        
        bodyStyle  = body.style;
        bodyLStyle = bodyL.style;
        bodyRStyle = bodyR.style;
        
        panelL = doc.getElementById("panelL");
        panelLStyle = panelL.style;

        tabL = consoleL = doc.getElementById("consoleL");
        tabLStyle = consoleLStyle = consoleL.style;
        
        tabR = consoleR = doc.getElementById("consoleR");
        
        HTMLL = doc.getElementById("HTMLL");
    
        consoleBody = consoleL;
        consoleBody = consoleL;
        consoleBodyFrame = panelL;
        
        topHeight = header.offsetHeight;
    
        vSplitter.onmousedown = onVSplitterMouseDown;
        hSplitter.onmousedown = onHSplitterMouseDown;
        
        // TODO: refactor
        selectedTab = 0; //Console
        rightPanelVisible = false;
        // TODO: refactor
    
        if (context == this.Popup)
        {
            frame = doc.body;
            
            if (isIE)
            {
                this.adjustPanelWitdh();
              
                var table = doc.getElementById("table");
                table.style.position = "absolute";
                table.style.marginTop = "-1px";
            }
        }
        else
        {
            frame = document.getElementById("FirebugChrome");
            frameStyle = frame.style;
            
            // TODO: If the document body has some margin (IE default behaviour), the 
            // window won't fit correctly, so an event handler should be added
            if (isIE)
            {
              this.adjustPanelWitdh();
              
              var margin = document.body.currentStyle.marginRight;
              
              if (margin == "10px")
                  frameStyle.width = "102%";
              //else
              //  alert(margin + "TODO: need to add a onresize event to adjust the window width");

            }
        }
        
        var controllers = context.controllers;
        if(controllers)
            for(var i=0, ci; ci=controllers[i]; i++)
                addEvent.apply(this, ci);
                

        if (isOpera) this.draw();

            
        // TODO: integrate code
        
        //OUT      = doc.getElementById("consoleL");
        //OUT.style.padding = "4px 4px 4px 7px";
        if(!!chromeLoad) chromeLoad(doc);
        /**/
        
    },

    finalizeContext: function(context)
    {
        chromeReady = false;
        this.context.element = null;
        this.frame = null;
        
        body      = null;
        cmdLine   = null;
        header    = null;
        vSplitter = null;
        hSplitter = null;
        bottom    = null;
        bodyR     = null;
        
        bodyRStyle = null;
        bodyStyle = null;
    
        topHeight = null;
        
        var controllers = context.controllers;
        if(controllers)
            for(var i=0, ci; ci=controllers[i]; i++)
              removeEvent.apply(this, ci);
    },
    
    //
    toggle: function(forceOpen, popup)
    {
        if(popup)
        {
            var context = Chrome.context = this.Popup; 
            if(frame)
            {
                if(!context.element)
                {     
                    if (this.Frame.element)
                    {
                        this.Frame.isVisible = false;
                        frame.style.visibility = "hidden";
                    }
                    
                    chromeReady = false;
                    context.create();
                    waitForChrome();
                }
            }
            else
                waitForDocument();
        }
        else
        {
            var context = Chrome.context = this.Frame; 
            context.isVisible = forceOpen || !context.isVisible;
            
            if(frame)
            { 
                if(context.element)
                {
                    if(context.isVisible)
                    {
                        frame.style.visibility = "visible";
                        waitForChrome();
                        
                    } else {
                        frame.style.visibility = "hidden";
                    }
                }
                else
                {
                    context.create();
                    waitForChrome();
                }
                    
            }
            else
                waitForDocument();
            
        }
    },


    draw: function()
    {
        var height = frame.clientHeight;
        //var height = frame.ownerDocument.defaultView.innerHeight;
        
        var cmdHeight = cmdLine.offsetHeight;
        var fixedHeight = topHeight + cmdHeight;
        var y = Math.max(height, topHeight);
        



        //console.log("draw() -- height: %d", height, frame);
        
        if (isFirefox)
            setTimeout(function(){
                y = Chrome.win.innerHeight;
                frame.style.height = y + "px";
                body.style.maxHeight = Math.max(y -1 - fixedHeight, 0)+ "px";



        /*
        var width = frame.offsetLeft + frame.clientWidth;
        var x = width - vSplitter.offsetLeft;
        
        bodyRStyle.width = x + "px";
        vSplitterStyle.right = x - 6 + "px";
        toolbarRFrameStyle.width = x + "px";
        bodyLStyle.width = width - x + "px";                
        panelLStyle.width = width - x + "px";
        consoleLStyle.width = width -20 - x + "px";        
        /**/
        
                //vSplitterStyle.height = y - 23-cmdHeight + "px"; 
            }, 0);
        else
            setTimeout(function(){ 
                vSplitterStyle.height = y - 25 - cmdHeight + "px"; 
                frame.style.height = y + "px";
                body.style.height = Math.max(y - fixedHeight, 0)+ "px";

        var width = frame.offsetLeft + frame.clientWidth;
        var x = rightPanelVisible ? (width - vSplitter.offsetLeft) : 0;
        
        bodyRStyle.width = x + "px";
        //vSplitterStyle.right = x - 6 + "px";
        toolbarRFrameStyle.width = x + "px";
        bodyLStyle.width = width - x + "px";                
        panelLStyle.width = width - x + "px";
        tabLStyle.width = width -20 - x + "px";        
                
            }, 40);
    
        
        //if(isIE) 
        //  Chrome.adjustPanelWitdh();
        
    },
    
    adjustPanelWitdh: function()
    {
        var width = frame.offsetLeft + frame.clientWidth;
        var x = bodyR.offsetWidth - (rightPanelVisible ? 20 : 0);
        
        bodyLStyle.width = width - x + "px";
        panelLStyle.width = width - x + "px";
    },
    
    saveSettings: function()
    {
    },
    
    restoreSettings: function()
    {
    }
    

};


// ************************************************************************************************
// Chrome Internals


// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
var chromeReady = false;
var selectedTab = 0; //Console

FBL.frame = null;
FBL.frameStyle = null;

FBL.bottomVisible = true;
FBL.rightPanelVisible = false;

FBL.body = null;
FBL.cmdLine = null;
FBL.header = null;
FBL.vSplitter = null;
FBL.hSplitter = null;
FBL.bottom = null;
FBL.bodyL = null;
FBL.bodyR = null;
FBL.toolbarRFrame = null;
FBL.toolbarRFrameStyle = null;

FBL.vSplitterStyle = null;

FBL.bodyStyle = null;
FBL.bodyLStyle = null;
FBL.bodyRStyle = null;

FBL.consoleL = null;
FBL.consoleR = null;

FBL.HTMLL = null;

FBL.tabL = null;
FBL.tabR = null;

FBL.consoleLStyle = null;
FBL.tabLStyle = null;

FBL.panelL = null;
FBL.panelLStyle = null;

FBL.consoleBody = null;
FBL.consoleBody = null;
FBL.consoleBodyFrame = null;

FBL.topHeight = null;

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *


// ************************************************************************************************
// Section
function waitForDocument()
{
    var console = window[FBL.consoleNS];
    if (document.body && console && typeof window.FBL.loaded != "undefined")
        onDocumentLoad();
    else
        setTimeout(waitForDocument, 100);
};

function onDocumentLoad()
{
    Chrome.context.create();
    waitForChrome();
};

function waitForChrome()
{
    var f = FBL.frame;
    if (f && (Chrome.context == Chrome.Frame) && f.contentWindow &&  
        f.contentWindow.document.getElementById("commandLine") || // frame loaded
        
        f && (Chrome.context == Chrome.Popup) &&  f.document && 
        f.document.getElementById("commandLine")) // popup loaded
    {
        if (!chromeReady)
            Chrome.onChromeReady();
    }
    else
        setTimeout(waitForChrome, 100);
};
    
/*
function onChromeLoad()
{
    var frame = FBL.frame;
        
    if (Chrome.context == Chrome.Frame)
    {
        Chrome.doc = frame.contentWindow.document;
        Chrome.win = frame.contentWindow.window;
    }
    else
    {
        Chrome.doc = frame.document;
        Chrome.win = frame.window;
    }
    
    Chrome.win.FB = FBL.ChromeAPI;

    Chrome.context.onReady(Chrome.doc);
    Chrome.initializeContext(Chrome.doc, Chrome.context);
    
    Chrome.draw();    
};
/**/


function focusCommandLine()
{
    //toggleConsole(true);
    //if (commandLine)
    //    commandLine.focus();
};





// ************************************************************************************************
// Section

function onGlobalKeyDown(event)
{
    if (event.keyCode == 123 /* F12 */)
        if (!FBL.isFirefox && !event.shiftKey || event.shiftKey && FBL.isFirefox)
        {
            FBL.Firebug.Chrome.toggle(false, event.ctrlKey);
            FBL.cancelEvent(event, true);
        }

}


// ************************************************************************************************
// Section

function onHSplitterMouseDown(event)
{
    FBL.addEvent(document, "mousemove", onHSplitterMouseMove);
    FBL.addEvent(document, "mouseup", onHSplitterMouseUp);
  
    for (var i = 0; i < frames.length; ++i)
    {
        FBL.addEvent(frames[i].document, "mousemove", onHSplitterMouseMove);
        FBL.addEvent(frames[i].document, "mouseup", onHSplitterMouseUp);
    }
    
    return false;
};


function onHSplitterMouseMove(event)
{
    var frame = FBL.frame;
    var frameStyle = FBL.frameStyle;
    var topHeight = FBL.topHeight;
    var cmdLine = FBL.cmdLine;
    var vSplitterStyle = FBL.vSplitterStyle;
    
    var clientY = event.clientY;
    var win = document.all
        ? event.srcElement.ownerDocument.parentWindow
        : event.target.ownerDocument && event.target.ownerDocument.defaultView;
  
    if (!win)
        return;
    
    if (win != win.parent)
        clientY += win.frameElement ? win.frameElement.offsetTop : 0;
    
    var height = frame.offsetTop + frame.clientHeight;
    var fixedHeight = topHeight + cmdLine.offsetHeight + 1;
    var y = Math.max(height - clientY + 7, topHeight);
        y = Math.min(y, document.body.scrollHeight);
      

    if(FBL.isIE)
        setTimeout(function(){ 
            //vSplitterStyle.height = y - 147 + "px";
            frameStyle.height = y + "px";
        }, 25);
      
    else if (FBL.isOpera)
        setTimeout(function(){ 
            frameStyle.height = y + "px";
            bodyStyle.height = Math.max(y - fixedHeight, 0)+ "px";
        }, 75);
      
    else if (FBL.isFirefox)
    {
        frameStyle.height = y + "px";
        setTimeout(function(){ 
            bodyStyle.maxHeight = Math.max(y - fixedHeight, 0)+ "px";
        }, 50);
    }  
    else
    {
        frameStyle.height = y + "px";
    }
    
    return false;
};

function onHSplitterMouseUp(event)
{
    FBL.removeEvent(document, "mousemove", onHSplitterMouseMove);
    FBL.removeEvent(document, "mouseup", onHSplitterMouseUp);
  
    for (var i = 0; i < frames.length; ++i)
    {
        FBL.removeEvent(frames[i].document, "mousemove", onHSplitterMouseMove);
        FBL.removeEvent(frames[i].document, "mouseup", onHSplitterMouseUp);
    }
    
    setTimeout(Chrome.draw, 0);
};


// ************************************************************************************************
// Section

function onVSplitterMouseDown(event)
{
    FBL.addEvent(Chrome.context.document, "mousemove", onVSplitterMouseMove);
    FBL.addEvent(Chrome.context.document, "mouseup", onVSplitterMouseUp);
  
    for (var i = 0; i < frames.length; ++i)
    {
        FBL.addEvent(frames[i].document, "mousemove", onVSplitterMouseMove);
        FBL.addEvent(frames[i].document, "mouseup", onVSplitterMouseUp);
    }

    FBL.cancelEvent(event, true);
    return false; 
};


var lastVSplitterMouseMove = 0;

function onVSplitterMouseMove(event)
{
    var frame = FBL.frame;
    var bodyRStyle = FBL.bodyRStyle;
    var bodyLStyle = FBL.bodyLStyle;
    var panelLStyle = FBL.panelLStyle;
    var tabLStyle = FBL.tabLStyle;
    var toolbarRFrameStyle = FBL.toolbarRFrameStyle;
    var vSplitterStyle = FBL.vSplitterStyle;
    
    if (new Date().getTime() - lastVSplitterMouseMove > 40)
    {
        lastVSplitterMouseMove = new Date().getTime();
    
        var clientX = event.clientX;
        var win = document.all
            ? event.srcElement.ownerDocument.parentWindow
            : event.target.ownerDocument.defaultView;
      
        if (win != win.parent)
            clientX += win.frameElement ? win.frameElement.offsetLeft : 0;
        
        var width = frame.offsetLeft + frame.clientWidth;
        var x = Math.max(width - clientX + 3, 7);
        
        if (FBL.isIE)
            setTimeout(function(){
                bodyRStyle.width = x + "px";
                vSplitterStyle.right = x - 6 + "px";
                toolbarRFrameStyle.width = x + "px";
                bodyLStyle.width = width - x + "px";                
                panelLStyle.width = width - x + "px";
                tabLStyle.width = width -20 - x + "px";
            },25);

        // TODO: Chrome bug - confirm if this happens on safari
        else
        {
            if (FBL.isSafari)
                setTimeout(function(){
                    bodyRStyle.width = x + "px";
                    toolbarRFrameStyle.width = x -1 + "px";
                    vSplitterStyle.right = x - 6 + "px";
                    bodyLStyle.width = width - x + "px";
                    panelLStyle.width = width - 2 - x + "px";
                },0);
            else
            {
                bodyRStyle.width = x + "px";
                toolbarRFrameStyle.width = x -1 + "px";
                vSplitterStyle.right = x -6 + "px";
            }
        }
    }
    
    FBL.cancelEvent(event, true);
    return false;
};


function onVSplitterMouseUp(event)
{
    //Chrome.draw();
    FBL.removeEvent(Chrome.context.document, "mousemove", onVSplitterMouseMove);
    FBL.removeEvent(Chrome.context.document, "mouseup", onVSplitterMouseUp);
  
    for (var i = 0; i < frames.length; ++i)
    {
        FBL.removeEvent(frames[i].document, "mousemove", onVSplitterMouseMove);
        FBL.removeEvent(frames[i].document, "mouseup", onVSplitterMouseUp);
    }
};


// ************************************************************************************************
// ***  TODO:  ORGANIZE  **************************************************************************
// ************************************************************************************************
function chromeLoad(doc)
{
  
    var rootNode = document.documentElement;
    
    /* Console event handlers */
    FBL.addEvent(FBL.consoleL, 'mousemove', onListMouseMove);
    FBL.addEvent(FBL.consoleL, 'mouseout', onListMouseOut);

    /*
     TODO: Organize 
     
    #treeInput {
      position: absolute;
      font: 11px Monaco, monospace;
      margin: 0;
      padding: 0;
      border: 1px solid #777;
    }
    
    */
    var html = [];
    FBL.Firebug.HTML.appendTreeNode(rootNode, html);
    FBL.HTMLL.innerHTML = '';
    FBL.HTMLL.innerHTML = html.join('');
    FBL.HTMLL.style.padding = "0 10px 0 15px";
    FBL.HTMLL.style.display = "none";

    var doc = FBL.Firebug.Chrome.doc;
    var input = doc.createElement("input");
    input.id = "treeInput"
    input.style.cssText = "position: absolute; font: 11px Monaco, monospace; margin: 0; padding: 0; border: 1px solid #777;"
    input.style.display = "none";
    doc.body.appendChild(input);

    /* HTML event handlers */
    input.onblur = FBL.HTMLL.onscroll = function()
    {
        input.style.display = "none";
    };
    FBL.addEvent(FBL.HTMLL, 'click', onTreeClick);
    FBL.addEvent(FBL.HTMLL, 'mousemove', onListMouseMove);
    FBL.addEvent(FBL.HTMLL, 'mouseout', onListMouseOut);
    
}

function onListMouseOut(e)
{
    e = e || event || window;
    var targ;
    
    if (e.target) targ = e.target;
    else if (e.srcElement) targ = e.srcElement;
    if (targ.nodeType == 3) // defeat Safari bug
      targ = targ.parentNode;
        
      if (targ.id == "consoleL") {
          FBL.Firebug.Inspector.hideBoxModel();
          hoverElement = null;        
      }
};
    
var hoverElement = null;
var hoverElementTS = 0;

function onListMouseMove(e)
{
    try
    {
        e = e || event || window;
        var targ;
        
        if (e.target) targ = e.target;
        else if (e.srcElement) targ = e.srcElement;
        if (targ.nodeType == 3) // defeat Safari bug
            targ = targ.parentNode;
            
        var found = false;
        while (targ && !found) {
            if (" objectBox-element objectBox-selector ".indexOf(" " + targ.className + " ") == -1)
            //if (!/\sobjectBox-element\s|\sobjectBox-selector\s/.test(" " + targ.className + " "))
                targ = targ.parentNode;
            else
                found = true;
        }
        
        if (!targ)
        {
            FBL.Firebug.Inspector.hideBoxModel();
            hoverElement = null;
            return;
        }
        
        if (typeof targ.attributes[FBL.cacheID] == 'undefined') return;
        
        var uid = targ.attributes[FBL.cacheID];
        if (!uid) return;
        
        var el = FBL.documentCache[uid.value];
        
        if (el.id == "FirebugChrome") return false;  
    
        var nodeName = el.nodeName.toLowerCase();
        
    
        if (FBL.isIE && " meta title script link ".indexOf(" "+nodeName+" ") != -1)
            return;
    
        //if (!/\sobjectBox-element\s|\sobjectBox-selector\s/.test(" " + targ.className + " ")) return;
        if (" objectBox-element objectBox-selector ".indexOf(" " + targ.className + " ") == -1) return;
        
        if (" html head body br script link ".indexOf(" "+nodeName+" ") != -1) { 
            FBL.Firebug.Inspector.hideBoxModel();
            hoverElement = null;
            return;
        }
      
        if ((new Date().getTime() - hoverElementTS > 40) && hoverElement != el) {
            hoverElementTS = new Date().getTime();
            hoverElement = el;
            FBL.Firebug.Inspector.drawBoxModel(el);
        }
    }
    catch(E)
    {
    }
}

var selectedElement = null
function selectElement(e)
{
    if (e != selectedElement)
    {
        if (selectedElement)
            selectedElement.className = "objectBox-element";
            
        
        e.className = e.className + " selectedElement";

        if (FBL.isFirefox)
            e.style.MozBorderRadius = "3px";
        
        selectedElement = e;
    }
}

function onTreeClick(e)
{
    e = e || event;
    var targ;
    
    if (e.target) targ = e.target;
    else if (e.srcElement) targ = e.srcElement;
    if (targ.nodeType == 3) // defeat Safari bug
        targ = targ.parentNode;
        
    
    if (targ.className.indexOf('nodeControl') != -1 || targ.className == 'nodeTag')
    {
        if(targ.className == 'nodeTag')
        {
            var control = FBL.isIE ? (targ.parentNode.previousSibling || targ) :
                          (targ.previousSibling.previousSibling || targ);
            
            if (control.className.indexOf('nodeControl') == -1)
                return;
            
            selectElement(targ.parentNode);
        } else
            control = targ;
        
        FBL.cancelEvent(e);
        
        var treeNode = FBL.isIE ? control.nextSibling : control.parentNode;
        
        if (control.className.indexOf(' nodeMaximized') != -1) {
            control.className = 'nodeControl';
            FBL.Firebug.HTML.removeTreeChildren(treeNode);
        } else {
            control.className = 'nodeControl nodeMaximized';
            FBL.Firebug.HTML.appendTreeChildren(treeNode);
        }
    }
    else if (targ.className == 'nodeValue' || targ.className == 'nodeName')
    {
        var input = FBL.Firebug.Chrome.doc.getElementById('treeInput');
        
        input.style.display = "block";
        input.style.left = targ.offsetLeft + 'px';
        input.style.top = FBL.topHeight + targ.offsetTop - FBL.panelL.scrollTop + 'px';
        input.style.width = targ.offsetWidth + 6 + 'px';
        input.value = targ.textContent || targ.innerText;
        input.focus(); 
    }
}
// ************************************************************************************************
// ************************************************************************************************
// ************************************************************************************************


// ************************************************************************************************
}});

FBL.ns(function() { with (FBL) {
// ************************************************************************************************

var Chrome = Firebug.Chrome;

//----------------------------------------------------------------------------
// Frame Chrome
//----------------------------------------------------------------------------
Firebug.Chrome.Frame = inherit(Firebug.Chrome,
{
    element: null,
    viewport: null,
    document: null,
    
    isVisible: false, 
    scrollHandler: null,
    
    onReady: function(doc)
    {
        var context = Chrome.Frame;
        
        context.controllers = [
            [window, "resize", Chrome.draw],
            [window, "unload", Chrome.destroy]
          ];
          
        if (isIE) {
            context.scrollHandler = [window, "scroll", context.fixPosition];
            //addEvent.apply(this, context.scrollHandler);
        }
    
        frame.style.visibility = context.isVisible ? "visible" : "hidden";    
    },

    create: function(){
    
        if (Chrome.Frame.element)
            return;
    
        var injectedMode = Chrome.injectedMode;
        
        frame = Chrome.element = Chrome.Frame.element = document.createElement("iframe");
        
        Chrome.element = Chrome.Frame.element = frame;
        frame.id = "Firebug";
        frame.setAttribute("id", "FirebugChrome");
        frame.setAttribute("frameBorder", "0");
        frame.style.visibility = "hidden";
        frame.style.zIndex = "2147483647"; // MAX z-index = 2147483647
        frame.style.position = document.all ? "absolute" : "fixed";
        frame.style.width = "100%"; // "102%"; IE auto margin bug
        frame.style.left = "0";
        frame.style.bottom = "-1px";
        frame.style.height = Chrome.chromeHeight + "px";
        
        
        if (!injectedMode)
            frame.setAttribute("src", skinURL+"firebug.html");

        document.body.appendChild(frame);
        
        if (injectedMode)
        {
            var doc = frame.contentWindow.document;
            doc.write('<style>'+ Chrome.Injected.CSS + '</style>');
            doc.write(Chrome.Injected.HTML);
            doc.close();
        }
    },
    
    
    fixPosition: function()
    {
        var maxHeight = document.body.clientHeight;
        
        //var height = Chrome._maximized ? maxHeight-1 : Chrome._height;
        var height = Chrome.chromeHeight;
        
        Chrome.elementStyle.top = maxHeight - height + document.body.scrollTop + "px"; 
    }
});

FBL.createFrame = Chrome.Frame.create;

// ************************************************************************************************
}});

FBL.ns(function() { with (FBL) {
// ************************************************************************************************

var Chrome = Firebug.Chrome;

//----------------------------------------------------------------------------
// Popup Chrome
//----------------------------------------------------------------------------
Firebug.Chrome.Popup =
{
    element: null,
    viewport: null,
    document: null,
    
    controllers: null,
    
    onReady: function(doc)
    {
        if (isIE6)
            fixIE6BackgroundImageCache(doc);

        var context = Chrome.Popup;
        
        doc.body.className = "FirebugPopup";
        
        context.controllers = [
            [Chrome.win, "resize", Chrome.draw],
            [Chrome.win, "unload", Chrome.destroy]
          ];
    },

    create: function()
    {
        var injectedMode = Chrome.injectedMode;
        
        var url = injectedMode ? "" : (skinURL + Chrome.interfaceFile);
        
        var height = Chrome.chromeHeight;
        var options = [
            "true,top=",
            Math.max(screen.height - height, 0),
            ",left=0,height=",
            height,
            ",width=",
            screen.width-10, // Opera opens popup in a new tab if it's too big
            ",resizable"          
          ].join("");
        
        var popup = Chrome.Popup.element = window.open(
            url, 
            "popup", 
            options
          );
        
        if (injectedMode)
        {
            var doc = popup.document;
            doc.write("<style>"+ Chrome.Injected.CSS + "</style>");
            doc.write(Chrome.Injected.HTML);
            doc.close();
        }
        
        FBL.frame = popup;
        
        if (popup)
            popup.focus();
        else
        {
            Chrome.Popup.element = null;
            alert("Disable the popup blocker to open the console in another window!")
        }
    }
};


Chrome.context = Chrome.Frame;
if (document.documentElement.getAttribute("debug") == "true")
    Chrome.toggle(true);


// ************************************************************************************************
}});

FBL.ns(function() { with (FBL) {
// ************************************************************************************************

//----------------------------------------------------------------------------
// Injected Chrome
//----------------------------------------------------------------------------
Firebug.Chrome.Injected = 
{
    CSS: 'html,body{margin:0;padding:0;overflow:hidden;background:#fff;font-family:Lucida Grande,Tahoma,sans-serif;font-size:11px;}div.clear{clear:both;}#table{overflow:hidden;height:100%;width:100%;border-collapse:collapse;background:#fff;}#header{height:50px;}#titlebar{position:absolute;z-index:5;width:100%;top:0;background:url(http://pedrosimonetti.googlepages.com/sprite.png) #eee 0 0;height:27px;font-size:11px;}#toolbar{top:27px;position:absolute;z-index:8;width:100%;background:url(http://pedrosimonetti.googlepages.com/sprite.png) #d9d9d9 0 -27px;height:23px;}#body{height:100%;vertical-align:top;}#bottom{height:18px;background:#fff;}#titlebarIcon{position:absolute;top:5px;left:10px;}#titlebarIcon a{display:block;height:20px;width:20px;background:url(http://pedrosimonetti.googlepages.com/sprite.png) #eee 0 -134px;text-decoration:none;cursor:default;}#titlebarButtons{position:absolute;top:5px;left:35px;}#titlebarButtons span{margin:0;padding:0;}#titlebarButtons a{text-decoration:none;display:block;float:left;color:#000;margin:1px;padding:3px 7px 3px;cursor:default;}#titlebarButtons a:hover{color:#333;margin:0;_margin:0 1px 1px;border:1px solid #fff;border-bottom:1px solid #bbb;border-right:1px solid #bbb;_padding:3px 6px 3px 6px;}#mainButtons{position:absolute;right:4px;top:7px;z-index:11;}#toolbarL{width:255px; z-index:8;left:0;white-space:nowrap;background:url(http://pedrosimonetti.googlepages.com/sprite.png) #d9d9d9 0 -27px;position:absolute;left:4px;}#toolbarRFrame{background:url(http://pedrosimonetti.googlepages.com/sprite.png) #d9d9d9 0 -27px;position:absolute;height:23px;width:300px; z-index:9;right:0;}#toolbarR{position:absolute;width:290px; height:23px;padding-left:10px;}#bodyL,#bodyR{max-height:inherit;height:100%;font-size:11px;}#bodyR{background:#fff;}#bodyR{width:300px;background:#fff;}#panelLFrame{}#consoleL{}#consoleR{padding-left:6px;background:#fff;}.hide{overflow:hidden !important;position:fixed !important;display:none !important;visibility:hidden !important;}#command{height:18px;}#commandFrame{width:100%;height:19px;_height:18px;bottom:0;overflow:hidden;z-index:9;position:absolute;background:#fff;border:0;border-top:1px solid #ccc;}#commandIcon{position:absolute;color:#00f;top:2px;left:7px;display:inline;font:11px Monaco,monospace;z-index:10;}#commandLine{position:absolute;width:100%;height:19px;top:0;left:0;border:0;margin:0;padding:2px 0 2px 32px;font:11px Monaco,monospace;z-index:9;}#bottom[fixFirefox]{position:fixed;bottom:0;left:0;width:100%;z-index:10;}#bottom[fixFirefox] #command{display:block;}div.FitHeight{padding:0 1px;max-height:inherit;height:100%;overflow:auto;}#mainButtons a{font-size:1px;width:16px;height:16px;display:block;float:left;text-decoration:none;cursor:default;}#close{background:url(http://pedrosimonetti.googlepages.com/sprite.png) 0 -119px;}#close:hover{background:url(http://pedrosimonetti.googlepages.com/sprite.png) -16px -119px;}#detach{background:url(http://pedrosimonetti.googlepages.com/sprite.png) -32px -119px;}#detach:hover{background:url(http://pedrosimonetti.googlepages.com/sprite.png) -48px -119px;}.tab{text-decoration:none;display:block;float:left;width:auto;float:left;cursor:default;font-family:Lucida Grande,Tahoma,sans-serif;font-size:11px;font-weight:bold;height:23px;color:#565656;}.toolbarPanel span{display:block;float:left;}.toolbarPanel .tabL,.toolbarPanel .tabR{height:23px;width:8px;}.toolbarPanel .tabText{padding:4px 1px 0;}.tab:hover{background:url(http://pedrosimonetti.googlepages.com/sprite.png) 0 -73px;}.tab:hover .tabL{background:url(http://pedrosimonetti.googlepages.com/sprite.png) -16px -96px;}.tab:hover .tabR{background:url(http://pedrosimonetti.googlepages.com/sprite.png) -24px -96px;}.selectedTab{background:url(http://pedrosimonetti.googlepages.com/sprite.png) #e5e5e5 0 -50px !important;color:#000;}.selectedTab .tabL{background:url(http://pedrosimonetti.googlepages.com/sprite.png) 0 -96px !important;}.selectedTab .tabR{background:url(http://pedrosimonetti.googlepages.com/sprite.png) -8px -96px !important;}#hSplitter{position:absolute;left:0;top:0;width:100%;height:15px;font-size:10px;cursor:n-resize !important;background:url(http://pedrosimonetti.googlepages.com/pixel_transparent.gif);z-index:9;}.vSplitter{background:#eee;color:#000;border:1px solid #777;border-width:0 1px;width:4px;_width:6px;cursor:e-resize;overflow:hidden;right:294px;text-decoration:none;z-index:9;position:absolute;height:100%;top:27px;}div.lineNo{font:11px Monaco,monospace;float:left;display:inline;position:relative;margin:0;padding:0 5px 0 20px;background:#eee;color:#888;border-right:1px solid #ccc;text-align:right;}pre.nodeCode{font:11px Monaco,monospace;margin:0;padding-left:10px;overflow:hidden;_width:100%;}.nodeControl{margin-top:3px;margin-left:-14px;float:left;_position:absolute;_margin-left:-10px;width:9px;height:9px;overflow:hidden;cursor:default;background:url(http://pedrosimonetti.googlepages.com/tree_open.gif);}div.nodeMaximized{background:url(http://pedrosimonetti.googlepages.com/tree_close.gif);}div.objectBox-element{padding:1px 3px;}.objectBox-selector{cursor:default;}.selectedElement{background:#0A246A;color:#fff !important;}.selectedElement span{color:#fff !important;}.logRow *{font-size:11px;}.logRow{position:relative;border-bottom:1px solid #D7D7D7;padding:2px 4px 1px 6px;background-color:#FFFFFF;}.logRow-command{font-family:Monaco,monospace;color:blue;}.objectBox-string,.objectBox-text,.objectBox-number,.objectBox-function,.objectLink-element,.objectLink-textNode,.objectLink-function,.objectBox-stackTrace,.objectLink-profile{font-family:Monaco,monospace;}.objectBox-null{padding:0 2px;border:1px solid #666666;background-color:#888888;color:#FFFFFF;}.objectBox-string{color:red;white-space:pre;}.objectBox-number{color:#000088;}.objectBox-function{color:DarkGreen;}.objectBox-object{color:DarkGreen;font-weight:bold;font-family:Lucida Grande,sans-serif;}.objectBox-array{color:#000;}.logRow-info,.logRow-error,.logRow-warning{background:#fff no-repeat 2px 2px;padding-left:20px;padding-bottom:3px;}.logRow-info{background-image:url(http://pedrosimonetti.googlepages.com/infoIcon.png);}.logRow-warning{background-color:cyan;background-image:url(http://pedrosimonetti.googlepages.com/warningIcon.png);}.logRow-error{background-color:LightYellow;background-image:url(http://pedrosimonetti.googlepages.com/errorIcon.png);color:#f00;}.errorMessage{vertical-align:top;color:#f00;}.objectBox-sourceLink{position:absolute;right:4px;top:2px;padding-left:8px;font-family:Lucida Grande,sans-serif;font-weight:bold;color:#0000FF;}.logRow-group{background:#EEEEEE;border-bottom:none;}.logGroup{background:#EEEEEE;}.logGroupBox{margin-left:24px;border-top:1px solid #D7D7D7;border-left:1px solid #D7D7D7;}.selectorTag,.selectorId,.selectorClass{font-family:Monaco,monospace;font-weight:normal;}.selectorTag{color:#0000FF;}.selectorId{color:DarkBlue;}.selectorClass{color:red;}.objectBox-element{font-family:Monaco,monospace;color:#000088;}.nodeChildren{padding-left:26px;}.nodeTag{color:blue;cursor:pointer;}.nodeValue{color:#FF0000;font-weight:normal;}.nodeText,.nodeComment{margin:0 2px;vertical-align:top;}.nodeText{color:#333333;}.nodeComment{color:DarkGreen;}.log-object{_position:relative;_height:100%;}.property{position:relative;clear:both;height:15px;}.propertyNameCell{vertical-align:top;float:left;width:28%;position:absolute;left:0;z-index:0;}.propertyValueCell{float:right;width:68%;background:#fff;position:absolute;_position:relative;padding-left:5px;display:table-cell;right:0;z-index:1;}.propertyName{font-weight:bold;}.FirebugPopup{height:100% !important;}.FirebugPopup #mainButtons{display:none !important;}.FirebugPopup #mainButtons{display:none !important;}.FirebugPopup #hSplitter{display:none !important;}.FirebugPopup #commandFrame{height:18px !important;_height:17px !important;}',
    HTML: '<table id="table" cellpadding="0" cellspacing="0" border="0"><tbody><tr><td id="header" colspan="2"><div id="mainButtons"><a id="detach" href="javascript:FB.detach()">&nbsp;</a><a id="close" href="javascript:FB.close()">&nbsp;</a></div><div id="hSplitter">&nbsp;</div><div id="titlebar"><div id="titlebarIcon"><a title="Firebug Lite Homepage" href="http://getfirebug.com/lite.html">&nbsp;</a></div><div id="titlebarButtons"><span><a href="javascript:void(0)">Inspect</a></span><span><a href="javascript:FB.clear()">Clear</a></span></div></div><div id="toolbar"><div id="toolbarL" class="toolbarPanel"><a id="tc" class="tab selectedTab" href="javascript:FB.showTab(0)"><span class="tabL"></span><span class="tabText">Console</span><span class="tabR"></span></a><a id="th" class="tab" href="javascript:FB.showTab(1)"><span class="tabL"></span><span class="tabText">HTML</span><span class="tabR"></span></a><a class="tab" href="javascript:void(0)"><span class="tabL"></span><span class="tabText">CSS</span><span class="tabR"></span></a><a class="tab" href="javascript:void(0)"><span class="tabL"></span><span class="tabText">Script</span><span class="tabR"></span></a><a class="tab" href="javascript:void(0)"><span class="tabL"></span><span class="tabText">DOM</span><span class="tabR"></span></a></div><div id="toolbarRFrame" class="hide"><div id="toolbarR" class="toolbarPanel"><a class="tab selectedTab" href="javascript:void(0);"><span class="tabL"></span><span class="tabText">Style</span><span class="tabR"></span></a><a class="tab" href="javascript:void(0)"><span class="tabL"></span><span class="tabText">Layout</span><span class="tabR"></span></a><a class="tab" href="javascript:void(0)"><span class="tabL"></span><span class="tabText">DOM</span><span class="tabR"></span></a></div></div></div></td></tr><tr id="body"><td id="bodyL"><div id="panelL" class="FitHeight"><div id="consoleL"></div><div id="HTMLL"></div></div></td><td id="bodyR" class="hide"><div id="vSplitter" class="vSplitter">&nbsp;</div><div id="consoleR" class="FitHeight"></div></td></tr><tr id="bottom"><td id="command" colspan="2"><div id="commandFrame"><div id="commandIcon">&gt;&gt;&gt;</div><input id="commandLine" name="commandLine" type="text"/></div></td></tr></tbody></table>'
    
};

// ************************************************************************************************
}});


FBL.ns(function() { with (FBL) {
// ************************************************************************************************

/*============================================================================
  inspector
*===========================================================================*/
var pixelsPerInch, boxModel, boxModelStyle, boxMargin, boxMarginStyle, 
  boxPadding, boxPaddingStyle, boxContent, boxContentStyle, offlineFragment;

var IEStantandMode = document.all && document.compatMode == "CSS1Compat";
var resetStyle = "margin:0; padding:0; border: 0; position:absolute; overflow:hidden; display:block; z-index: 2147483599;";
var boxModelVisible = false;

FBL.offlineFragment = null;

Firebug.Inspector =
{  
  
    onReady: function()
    {
        offlineFragment = document.createDocumentFragment();
        this.calculatePixelsPerInch();
        this.createInspector();
    },
    
  
    calculatePixelsPerInch: function()
    {
        var inch = document.createElement("div");
        inch.style.cssText = resetStyle + "width:1in; height:1in; visibility: hidden;";
        document.body.appendChild(inch);
        
        pixelsPerInch = {
            x: inch.offsetWidth,
            y: inch.offsetHeight
        };
        
        document.body.removeChild(inch);
    },
    
  
    createInspector: function()
    {
        boxModel = document.createElement("div");
        boxModel.id = "fbBoxModel";
        boxModelStyle = boxModel.style;
        boxModelStyle.cssText = resetStyle + "opacity:0.8; _filter:alpha(opacity=80);";
        
        boxMargin = document.createElement("div");
        boxMargin.id = "fbBoxMargin";
        boxMarginStyle = boxMargin.style;
        boxMarginStyle.cssText = resetStyle + "background: #EDFF64; height:100%; width:100%;";
        boxModel.appendChild(boxMargin);
        
        boxPadding = document.createElement("div");
        boxPadding.id = "fbBoxPadding";
        boxPaddingStyle = boxPadding.style;
        boxPaddingStyle.cssText = resetStyle + "background: SlateBlue;";
        boxModel.appendChild(boxPadding);
        
        boxContent = document.createElement("div");
        boxContent.id = "fbBoxContent";
        boxContentStyle = boxContent.style;
        boxContentStyle.cssText = resetStyle + "background: SkyBlue;";
        boxModel.appendChild(boxContent);
        
        offlineFragment.appendChild(boxModel);
    },
    
  
    drawBoxModel: function(el)
    {
        if (!boxModelVisible) this.showBoxModel();
        
        var top = this.getOffset(el, "offsetTop");
        var left = this.getOffset(el, "offsetLeft");
        var height = el.offsetHeight;
        var width = el.offsetWidth;
        
        var margin = this.getCSSMeasurementBox(el, "margin");
        var padding = this.getCSSMeasurementBox(el, "padding");
    
        boxModelStyle.top = top - margin.top;
        boxModelStyle.left = left - margin.left;
        boxModelStyle.height = height + margin.top + margin.bottom;
        boxModelStyle.width = width + margin.left + margin.right;
      
        boxPaddingStyle.top = margin.top;
        boxPaddingStyle.left = margin.left;
        boxPaddingStyle.height = height;
        boxPaddingStyle.width = width;
      
        boxContentStyle.top = margin.top + padding.top;
        boxContentStyle.left = margin.left + padding.left;
        boxContentStyle.height = height - padding.top - padding.bottom;
        boxContentStyle.width = width - padding.left - padding.right;
    },
    
  
    hideBoxModel: function()
    {  
        offlineFragment.appendChild(boxModel);
        boxModelVisible = false;
    },
    
  
    showBoxModel: function()
    {
        document.body.appendChild(boxModel);
        boxModelVisible = true;
    },
     
  
    /**
     * options.axis
     * options.floatValue
     */
    getCSSMeasurementInPixels: function(el, name, options)
    {
        if (!el) return null;
        
        options = options || {axis: "x", floatValue: false};
    
        var cssValue = this.getCSS(el, name);
        
        if(!cssValue) return 0;
        
        var reMeasure = /(\d+\.?\d*)(.*)/;
        var m = cssValue.match(reMeasure);
        
        if (m)
        {
        
            var value = m[1]-0;
            var unit = m[2].toLowerCase();
            
            if (unit == "px")
                return value;
              
            else if (unit == "pt")
                return this.pointsToPixels(value, options.axis, options.floatValue);
              
            if (unit == "em")
                return this.emToPixels(el, value);
              
            else if (unit == "%")
                return this.percentToPixels(el, value, options.axis);
          
        } else
            return 0;
    },
    
  
    getOffset: function(el, name)
    {
        if (!el) return 0;
        
        var isVertical = /Top|Bottom$/.test(name);
    
        // When in "Standard" Compliance mode, IE6 doesn't count the document
        // body margin when calculating offsetTop/offsetLeft, so we need to 
        // calculate it manually
        if (IEStantandMode)
            var offset = isVertical ? 
                this.getCSSMeasurementInPixels(document.body, "marginTop") :
                this.getCSSMeasurementInPixels(document.body, "marginLeft");
        else
            var offset = 0;
    
        var value = el[name];
        
        var display = this.getCSS(el, "display");
        var position = this.getCSS(el, "position");
        
        if (!document.all || display != "inline" && position != "relative")
            return offset + value;
        else
            return value + this.getOffset(el.parentNode, name);  
    },
    
    
    getCSSMeasurementBox: function(el, name)
    {
        var sufixes = ["Top", "Left", "Bottom", "Right"];
        var result = [];
        
        if (document.all)
        {
            var propName, cssValue;
            var autoMargin = null;
            
            for(var i=0, sufix; sufix=sufixes[i]; i++)
            {
                propName = name + sufix;
                
                cssValue = el.currentStyle[propName] || el.style[propName]; 
                
                if (cssValue == "auto")
                {
                    autoMargin = autoMargin || this.getCSSAutoMarginBox(el);
                    result[i] = autoMargin[sufix.toLowerCase()];
                }
                else
                    result[i] = this.getCSSMeasurementInPixels(el, propName);
                      
            }
        
        }
        else
        {
            for(var i=0, sufix; sufix=sufixes[i]; i++)
                result[i] = this.getCSSMeasurementInPixels(el, name + sufix);
        }
        
        return {top:result[0], left:result[1], bottom:result[2], right:result[3]};
    }, 
    
  
    getCSSAutoMarginBox: function(el)
    {
        if (isIE && " meta title input script link ".indexOf(" "+el.nodeName.toLowerCase()+" ") != -1)
            return {top:0, left:0, bottom:0, right:0};
        
        var box = document.createElement("div");
        box.style.cssText = "margin:0; padding:1px; border: 0; position:static; overflow:hidden; visibility: hidden;";
        
        var clone = el.cloneNode(false);
        var text = document.createTextNode("&nbsp;");
        clone.appendChild(text);
        
        box.appendChild(clone);
    
        document.body.appendChild(box);
        
        var marginTop = clone.offsetTop - box.offsetTop - 1;
        var marginBottom = box.offsetHeight - clone.offsetHeight - 2 - marginTop;
        
        var marginLeft = clone.offsetLeft - box.offsetLeft - 1;
        var marginRight = box.offsetWidth - clone.offsetWidth - 2 - marginLeft;
        
        document.body.removeChild(box);
        
        return {top:marginTop, left:marginLeft, bottom:marginBottom, right:marginRight};
    },
    
  
    pointsToPixels: function(value, axis, returnFloat)
    {
        axis = axis || "x";
        
        var result = value * pixelsPerInch[axis] / 72;
        
        return returnFloat ? result : Math.round(result);
    },
      
    
    emToPixels: function(el, value)
    {
        if (!el) return null;
        
        var fontSize = this.getCSSMeasurementInPixels(el, "fontSize");
        
        return Math.round(value * fontSize);
    },
    
    
    exToPixels: function(el, value)
    {
        if (!el) return null;
        
        // get ex value, the dirty way
        var div = document.createElement("div");
        div.style.position = "absolute";
        div.style.width = value + "ex";
        div.style.visibility = "hidden";
        
        document.body.appendChild(div);
        
        var value = div.offsetWidth;
        
        document.body.removeChild(div);
        
        return value;
    },
    
  
    percentToPixels: function(el, value)
    {
        if (!el) return null;
        
        // TODO:
    },
    
  
    getCSS: isIE ? function(el, name)
    {
        return el.currentStyle[name] || el.style[name] || undefined;
    }
    : function(el, name)
    {
        return document.defaultView.getComputedStyle(el,null)[name] 
            || el.style[name] || undefined;
    }
    /*
    getCSS: function(el, name)
    {
        return el.currentStyle ? // IE
            el.currentStyle[name] ||
            el.style[name] : 
            window.getComputedStyle ? // Mozilla
            document.defaultView.getComputedStyle(el,null)[name] || 
            el.style[name] :
            undefined;
    }
    /**/
};

// ************************************************************************************************
}});

FBL.ns(function() { with (FBL) {
// ************************************************************************************************


/*============================================================================
  html
*===========================================================================*/
Firebug.HTML =
{

    appendTreeNode: function(nodeArray, html)
    {
        var reTrim = /^\s+|\s+$/g;
      
        if (!nodeArray.length) nodeArray = [nodeArray];
        
        for (var n=0, node; node=nodeArray[n]; n++)
        {
        
            if (node.nodeType == 1)
            {
              
                var uid = node[cacheID];
                var child = node.childNodes;
                var childLength = child.length;
                var hasSingleTextChild = childLength == 1 && node.firstChild.nodeType == 3;
                
                var nodeName = node.nodeName.toLowerCase();
                
                var nodeControl = !hasSingleTextChild && childLength > 0 ? 
                    ('<div class="nodeControl"></div>') : '';

                
                if(isIE && nodeControl)
                  html.push(nodeControl);
              
                if (typeof uid != 'undefined')
                    html.push(
                        '<div class="objectBox-element" ',
                        cacheID, '="', uid,
                        '" id="', uid,                                                                                        
                        '">',
                        !isIE && nodeControl ? nodeControl: "",                        
                        '&lt;<span class="nodeTag">', nodeName, '</span>'
                      );
                else
                    html.push(
                        '<div class="objectBox-element">&lt;<span class="nodeTag">', 
                        nodeName, '</span>'
                      );
            
                for (var i = 0; i < node.attributes.length; ++i)
                {
                    var attr = node.attributes[i];
                    if (!attr.specified || attr.nodeName == cacheID)
                        continue;
                    
                    html.push('&nbsp;<span class="nodeName">', attr.nodeName.toLowerCase(),
                        '</span>=&quot;<span class="nodeValue">', escapeHTML(attr.nodeValue),
                        '</span>&quot;')
                }
            

                /*
                // source code nodes
                if (nodeName == 'script' || nodeName == 'style')
                {
                  
                    if(document.all){
                        var src = node.innerHTML+'\n';
                       
                    }else {
                        var src = '\n'+node.innerHTML+'\n';
                    }
                    
                    var match = src.match(/\n/g);
                    var num = match ? match.length : 0;
                    var s = [], sl = 0;
                    
                    for(var c=1; c<num; c++){
                        s[sl++] = '<div line="'+c+'">' + c + '</div>';
                    }
                    
                    html.push('&gt;</div><div class="nodeGroup"><div class="nodeChildren"><div class="lineNo">',
                            s.join(''),
                            '</div><pre class="nodeCode">',
                            escapeHTML(src),
                            '</pre>',
                            '</div><div class="objectBox-element">&lt;/<span class="nodeTag">',
                            nodeName,
                            '</span>&gt;</div>',
                            '</div>'
                        );
                      
                
                }/**/
                
                
                // Just a single text node child
                if (hasSingleTextChild)
                {
                    var value = child[0].nodeValue.replace(reTrim, '');
                    if(value)
                    {
                        html.push(
                                '&gt;<span class="nodeText">',
                                escapeHTML(value),
                                '</span>&lt;/<span class="nodeTag">',
                                nodeName,
                                '</span>&gt;</div>'
                            );
                    }
                    else
                      html.push('/&gt;</div>'); // blank text, print as childless node
                
                }
                else if (childLength > 0)
                {
                    html.push('&gt;</div>');
                }
                else 
                    html.push('/&gt;</div>');
          
            } 
            else if (node.nodeType == 3)
            {
                var value = node.nodeValue.replace(reTrim, '');
                if (value)
                    html.push('<div class="nodeText">', escapeHTML(value),
                        '</div>');
            }
          
        }
    },
    
    appendTreeChildren: function(treeNode)
    {
        var doc = Firebug.Chrome.doc;
        
        var uid = treeNode.attributes[cacheID].value;
        var parentNode = documentCache[uid];
        var treeNext = treeNode.nextSibling;
        var treeParent = treeNode.parentNode;
        
        var html = [];
        var children = doc.createElement("div");
        children.className = "nodeChildren";
        this.appendTreeNode(parentNode.childNodes, html);
        children.innerHTML = html.join("");
        
        treeParent.insertBefore(children, treeNext);
        
        var closeElement = doc.createElement("div");
        closeElement.className = "objectBox-element";
        closeElement.innerHTML = '&lt;/<span class="nodeTag">' + 
            parentNode.nodeName.toLowerCase() + '&gt;</span>'
        
        treeParent.insertBefore(closeElement, treeNext);
    },
    
    removeTreeChildren: function(treeNode)
    {
        var children = treeNode.nextSibling;
        var closeTag = children.nextSibling;
        
        children.parentNode.removeChild(children);  
        closeTag.parentNode.removeChild(closeTag);  
    }
    
}

// ************************************************************************************************
}});

FBL.initialize();
FBL.Firebug.Chrome.toggle(true);