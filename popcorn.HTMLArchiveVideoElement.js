/**
 * The HTMLVideoElement and HTMLAudioElement are wrapped media elements
 * that are created within a DIV, and forward their properties and methods
 * to a wrapped object.
 */
(function( Popcorn, window, document ) {

  var debug=true;
  var MIN_WIDTH = 320;
  var MIN_HEIGHT = 240;

  Popcorn.ia={};
    
  var log = function(obj){
    if (!debug)
      return false;
    
    if (typeof console !='undefined')
      console.log(obj);

    // for debugging, always return the 1st IA player!
    for (var ret in Popcorn.ia)
      return Popcorn.ia[ret];
  };
  if (debug)
    window.log = log;



  function HTMLArchiveVideoElement( id ) {
    log('new HTMLArchiveVideoElement("#'+id+'")');

    var self = this;
    var parent = typeof id === "string" ? Popcorn.dom.find( id ) : id;
   
    Popcorn.ia[id] = self; // stash a pointer for flash events to find us
    

    // Namespace all events we'll produce
    self._eventNamespace = Popcorn.guid( "HTMLArchiveVideoElement::" );

    // Mark type as Archive
    self._util.type = "Archive";

    self.parentNode = parent;

    // Internet Archive IDentifier -- eg: "commute" ( see http://archive.org/details/commute )
    self.iaid=null;  

    var EMPTY_STRING="";
    self.playerReady=false;
    self.flash=false;
    self.stallTimer=false;
    self.impl={
        src: EMPTY_STRING,
        networkState: self.NETWORK_EMPTY,
        readyState: self.HAVE_NOTHING,
        seeking: false,
        autoplay: true,//EMPTY_STRING,
        preload: EMPTY_STRING,
        controls: false,
        loop: false,
        poster: EMPTY_STRING,
        volume: 1,
        muted: 0,
        currentTime: 0,
        duration: NaN,
        ended: false,
        paused: true,
        width: parent.width|0   ? parent.width  : MIN_WIDTH,
        height: parent.height|0 ? parent.height : MIN_HEIGHT,
        error: null
      };
      
    
    self.setup = function(){ //xxx move this into changeSrc() instead and nix the stalling timer??
      // If "self.src" has been (externally) set, then "self.iaid" has also been set.
      // Thus, we'll know which "iaid" (Internet Archive IDentifier) to get.
      // If not, stall 100 ms and re-check...
      if (self.iaid===null){
        log('.');
        if (self.stallTimer) clearTimeout(self.stallTimer);
        self.stallTimer = setTimeout(self.setup, 500);//xxx 500
        return;
      }
        
      // Get the item metadata from archive.org for the given item/identifier.
      // This allows us to find the best video/audio file to play!
      // When we have the JSON in hand, call "init()".
      var metaurl="http://archive.org/metadata/"+self.iaid+"?&callback=jsonp";
      log('metaurl: '+metaurl);

      Popcorn.getJSONP( metaurl, self.init );
    };

      
    self.init = function( itemMetadata ){
        var width =(debug ? MIN_WIDTH  : 2*MIN_WIDTH);
        var height=(debug ? MIN_HEIGHT : 2*MIN_HEIGHT) + (debug ? 30 : 0);//xxxx
        
        var bestfi=false;
        var audio=false;
        //log(itemMetadata.files);
        // find best flash playable IA "derivative" for video
        for (i=0; i<itemMetadata.files.length; i++)
        {
          var fi=itemMetadata.files[i];
          if (fi.format=='h.264')       { bestfi = fi; break; }
          if (fi.format=='512Kb MPEG4') { bestfi = fi; break; }
        }
        if (bestfi===false){
          // find best flash playable IA "derivative" for audio
          for (i=0; i<itemMetadata.files.length; i++)
          {
            var fi=itemMetadata.files[i];
            if (fi.format=='VBR MP3')     { bestfi = fi; break; }
            if (fi.format=='MP3')         { bestfi = fi; break; }
          }
          audio=true;
        }
        log('bestfi: '+bestfi.name);

    
        var flashvars = {
          "netstreambasepath":"http%3A%2F%2Farchive.org%2F",
          "controlbar.position":(audio ? "top" : "over"),
          "playerready":"Popcorn.ia."+id+".flashReady",
          "id":id,
          "autoStart":(self.impl.autoplay ? true : false),
          "file":"%2Fdownload%2F"+self.iaid + encodeURIComponent('/'+bestfi.name)
        };
        if (audio) {
          flashvars.provider="sound";
          flashvars.icons=false;
          flashvars["controlbar.idlehide"]=false;
        } else {
          flashvars.provider="http";
          flashvars["http.startparam"]="start";
          flashvars["controlbar.idlehide"]=(debug ? false : true);
          if (debug)
            flashvars["controlbar.position"]="bottom";
        }
        attributes = {
          "name":self.iaid
        };

        //  extend options from user to flashvars.
        var options=[];
    
        Popcorn.extend( flashvars, options ); // like I have any idea what this does... 8-p
        //log(flashvars);

        params = {allowscriptaccess: "always",
                  allowfullscreen: "true",
                  enablejs: "true",
                  seamlesstabbing: "true",
                  wmode: "transparent"
                 };

        swfobject.embedSWF("http://archive.org/jw/player.swf", id,
                           width, (audio ? 60 : height), "9.0.0", "expressInstall.swf",
                           flashvars, params, attributes );
    };

    self.flashReady = function() {
        log('flashReady!');
        self.playerReady = true;
        self.flash = Popcorn.dom.find(id);

        self.flash.addModelListener     ("STATE", "Popcorn.ia."+id+".stateChanged");
        self.flash.addModelListener     ("TIME" , "Popcorn.ia."+id+".timed");
        self.flash.addModelListener     ("BUFFER","Popcorn.ia."+id+".buffered");
        self.flash.addModelListener     ("LOADED","Popcorn.ia."+id+".loaded");
        self.flash.addControllerListener("VOLUME","Popcorn.ia."+id+".volumed");
        self.flash.addControllerListener("MUTE",  "Popcorn.ia."+id+".muted");
        self.flash.addModelListener     ("ERROR", "Popcorn.ia."+id+".errored");


        self.impl.networkState  = self.NETWORK_LOADING;
        self.dispatchEvent( "loadstart" );
        self.dispatchEvent( "progress" );
        
        
        // xxx NOTE: think rest of this is ignored/noop for now...
        self.impl.networkState  = self.NETWORK_IDLE;
        self.impl.readyState  =   self.HAVE_METADATA;
        self.dispatchEvent( "loadedmetadata" );

        self.dispatchEvent( "loadeddata" );

        self.impl.readyState =  self.HAVE_FUTURE_DATA;
        self.dispatchEvent( "canplay" );

        self.impl.readyState =  self.HAVE_ENOUGH_DATA;
        self.dispatchEvent( "canplaythrough" );
        
        //xxx? if (self.impl.autoplay) self.play();
    };
    
      
    self.stateChanged = function( obj ){
      // NOTE: also "self.flash.getConfig().state"
      log('statechanged: '+obj.oldstate+' ==> '+obj.newstate);//xxx
      if (obj.newstate != 'PLAYING')
        self.impl.paused = true;
    };
      
    self.timed = function( obj ){
      self.impl.currentTime = obj.position;
      if (obj.duration > 0  &&  obj.duration != self.impl.duration){
        self.impl.duration    = obj.duration;
      }
    };
    
    self.volumed = function( obj ){
      self.impl.volume = obj.percentage / 100;
    };
    
    self.muted = function( obj ){
      self.impl.muted = (obj.state ? 1 : 0);
    };

    self.buffered = function( obj ){}; //xxx
    self.loaded   = function( obj ){}; //xxx
    self.errored = function( obj ){}; //xxx


    // Load "swfobject.embedSWF()" utility function if not already defined previously
    // Once it's loaded, we can call "setup()"
    if ( !window.swfobject )
      Popcorn.getScript("http://archive.org/jw/popcorn/swfobject.js", self.setup);
    else
      self.setup();
  

    // Add the helper function _canPlaySrc so this works like other wrappers.
    self.canPlaySrc = function( src ){
      log('m.canPlaySrc? '+ src);
      return "maybe";
    };
    self._canPlaySrc = function( src ){
      log('m._canPlaySrc? '+ src);
      return "maybe";
    };
    self.play = function(){
      log('mplay');
      if (self.flash)
        self.flash.sendEvent('PLAY');
      self.dispatchEvent( "play" );
      self.dispatchEvent( "playing" );
    };
    self.pause = function(){
      log('mpause');
      if (self.flash)
        self.flash.sendEvent('PLAY', false);
    };



    var isMuted = function() {
      if (!self.playerReady) 
        return false;
      return (self.flash.getConfig().mute ? true : false);
    };

    Object.defineProperties( self, {
      src: {
        get: function() {
          return self.impl.src;
        },
        set: function( aSrc ) {
          if( aSrc && aSrc !== self.impl.src ) {
            self.impl.src = aSrc;
            var tmp=aSrc.match(/archive\.org\/download\/([^\/]+)/);
            if (!tmp  ||  tmp.length != 2){
              alert('does not appear to be a valid "http://archive.org" download (perma)link.  cannot proceed.');
              return;
            }
            self.iaid = tmp[1];
            log('changeSrc: '+aSrc+', iaid: '+self.iaid);
            
            self.dispatchEvent( "loadstart" );
            self.dispatchEvent( "progress" );
            self.dispatchEvent( "durationchange" );
          }
        }
      },
      muted: {
        get: function() {
          return isMuted();
        },
        set: function( val ) {
          if (!self.playerReady)
            return;
          
          if ( isMuted() !== val ) 
            self.flash.sendEvent('MUTE');
        }
      },
      volume:{
        set: function( val ) {
          if (!self.playerReady)
            return 1;
          
          var volNow = self.flash.getConfig().volume / 100;
              
          if ( !val || typeof val !== "number" || ( val < 0 || val > 1 ) ) {
            return volNow;
          }

          if ( volNow !== val ) {
            self.flash.sendEvent("VOLUME", val * 100 );
            self.dispatchEvent( "volumechange" );//xxx
          }

          return volNow;
        },
        get: function() {
          if (!self.playerReady)
            return 1;
          
          return self.flash.getConfig().volume / 100;
        }
      },
      currentTime:{
        set:function( val ){
          if (!self.playerReady)
            return self.impl.currentTime;
          
          if ( !val )
            return self.impl.currentTime;

          self.impl.currentTime = Math.max(0,val);
          seeking = true;

          self.dispatchEvent( "seeked" );//xxx
          self.dispatchEvent( "timeupdate" );//xxx
              
          self.flash.sendEvent("SEEK", self.impl.currentTime ); // (float #seconds)
          
          return self.impl.currentTime;
        },
        get:function( ){
          return self.impl.currentTime;
        }
      },
      duration:{
        get:function(){
          return self.impl.duration;
        }
      },
      readyState: {
        get: function() {
          return self.impl.readyState;
        }
      },
      networkState: {
        get: function() {
          return self.impl.networkState;
        }
      }
    });
  };







  HTMLArchiveVideoElement.prototype = new Popcorn._MediaElementProto();
  //HTMLArchiveVideoElement.prototype.constructor = HTMLArchiveVideoElement;

  HTMLArchiveVideoElement.prototype._canPlaySrc = function( url  ) { return "maybe"; };
  HTMLArchiveVideoElement.prototype.canPlayType = function( type ) { return "probably"; };

  Popcorn.HTMLArchiveVideoElement = function( id ) {
    return new HTMLArchiveVideoElement( id );
  };
  Popcorn.HTMLArchiveVideoElement._canPlaySrc = HTMLArchiveVideoElement.prototype._canPlaySrc;


}( Popcorn, window, document ));
