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

this.extend = function(l, r)
{
	r = r || {};
    var newOb = {};
    for (var n in l)
        newOb[n] = l[n];
    for (var n in r)
        newOb[n] = r[n];

    return newOb;
};


this.append = function(l, r)
{
    for (var n in r)
        l[n] = r[n];
        
    return l;
};


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



//************************************************************************************************
// DOM

this.$ = function(id, doc)
{
    if (doc)
        return doc.getElementById(id);
    else
        return document.getElementById(id);
};

this.UI$ = function(id)
{
    if (FBL.Firebug.Chrome.document)
        return FBL.Firebug.Chrome.document.getElementById(id);
    else
        return undefined
};

// ************************************************************************************************
// Event

this.addEvent = function(object, name, handler)
{
    if (document.all)
        object.attachEvent("on"+name, handler);
    else
        object.addEventListener(name, handler, false);
};

this.removeEvent = function(object, name, handler)
{
    if (document.all)
        object.detachEvent("on"+name, handler);
    else
        object.removeEventListener(name, handler, false);
};

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
                
};


//************************************************************************************************
// Opera Tab Fix

function onOperaTabBlur(e)
{
    if (this.lastKey == 9)
      this.focus();
};

function onOperaTabKeyDown(e)
{
  this.lastKey = e.keyCode;
};

function onOperaTabFocus(e)
{
    this.lastKey = null;
};

this.fixOperaTabKey = function(el)
{
    el.onfocus = onOperaTabFocus;
    el.onblur = onOperaTabBlur;
    el.onkeydown = onOperaTabKeyDown;
};


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