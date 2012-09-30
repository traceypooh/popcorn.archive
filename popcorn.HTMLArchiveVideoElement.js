/**
 * The HTMLVideoElement and HTMLAudioElement are wrapped media elements
 * that are created within a DIV, and forward their properties and methods
 * to a wrapped object.
 */
(function( Popcorn, document ) {

  var debug=true;
  var MIN_WIDTH = 320;
  var MIN_HEIGHT = 240;

  Popcorn.ia={};
    
  var log = function(obj){
    if (debug  &&  typeof console !='undefined')
      console.log(obj);
  };


  function wrapMedia( id, callerSelf, parent ) {
    var EMPTY_STRING = "";

    Popcorn.ia[id] = {
      iaid:'camels', // default item if you brick your constructor ;-)
      id:id,
      playerReady:false,
      flash:false,
      media:document.createElement('video'),
      impl:{
        src: EMPTY_STRING,
        networkState: callerSelf.NETWORK_EMPTY,
        readyState: callerSelf.HAVE_NOTHING,
        seeking: false,
        autoplay: EMPTY_STRING,
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
      },
      
      setup:function(){
        // Get the item metadata from archive.org for the given item/identifier.
        // This allows us to find the best video(/audio) file to play!
        // When we have the JSON in hand, call "init()".
        var me=Popcorn.ia[id];
        Popcorn.getJSONP("http://archive.org/metadata/"+me.iaid+"?&callback=jsonp", 
                         me.init );
      },

      
      init:function( itemMetadata ){
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

    
        var me=Popcorn.ia[id];
        var flashvars = {
          "netstreambasepath":"http%3A%2F%2Farchive.org%2F",
          "controlbar.position":(audio ? "top" : "over"),
          "playerready":"Popcorn.ia."+id+".flashReady",
          "id":id,
          "autoStart":(me.impl.autoplay ? true : false),
          "file":"%2Fdownload%2F"+me.iaid + encodeURIComponent('/'+bestfi.name)
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
          "name":me.iaid
        };

        //  extend options from user to flashvars.
        var options=[];
    
        Popcorn.extend( flashvars, options ); // like I have any idea what this does... 8-p
        log(flashvars);

        params = {allowscriptaccess: "always",
                  allowfullscreen: "true",
                  enablejs: "true",
                  seamlesstabbing: "true",
                  wmode: "transparent"
                 };

        swfobject.embedSWF("http://archive.org/jw/player.swf", id,
                           width, (audio ? 60 : height), "9.0.0", "expressInstall.swf",
                           flashvars, params, attributes );
      },

      
      stateChanged:function( obj ){
        // NOTE: also "this.flash.getConfig().state"
        log('statechanged: '+obj.oldstate+' ==> '+obj.newstate);//xxx
        if (obj.newstate != 'PLAYING')
          this.impl.paused = true;
      },
      timed:function( obj ){
        //debugger;
//alert(this.flash.getConfig().position);//xxx find corresponding currentTime in *flash* object -- and maybe then can fully merge "impl" and "media" obj??

        this.impl.currentTime = obj.position;
        if (obj.duration > 0  &&  obj.duration != this.impl.duration){
          this.impl.duration    = obj.duration;
          this.media.duration   = obj.duration;
        }
      },
      buffered:function( obj ){ //xxx
      },
      loaded:function( obj ){ //xxx
      },
      volumed:function( obj ){
        this.impl.volume = obj.percentage / 100;
      },
      muted:function( obj ){
        this.impl.muted = (obj.state ? 1 : 0);
      },
      errored:function( obj ){ //xxx
      },
      flashReady:function() {
        log('flashReady!');
        this.playerReady = true;
        this.flash = $('#'+this.id).get(0);//xxx jQuery!

        this.flash.addModelListener     ("STATE", "Popcorn.ia."+this.id+".stateChanged");
        this.flash.addModelListener     ("TIME" , "Popcorn.ia."+this.id+".timed");
        this.flash.addModelListener     ("BUFFER","Popcorn.ia."+this.id+".buffered");
        this.flash.addModelListener     ("LOADED","Popcorn.ia."+this.id+".loaded");
        this.flash.addControllerListener("VOLUME","Popcorn.ia."+this.id+".volumed");
        this.flash.addControllerListener("MUTE",  "Popcorn.ia."+this.id+".muted");
        this.flash.addModelListener     ("ERROR", "Popcorn.ia."+this.id+".errored");


        // xxx NOTE: think rest of this is ignored/noop for now...
        this.impl.networkState = self.NETWORK_IDLE;
        this.impl.readyState = self.HAVE_METADATA;
        this.media.dispatchEvent( "loadedmetadata" );

        this.media.dispatchEvent( "loadeddata" );

        this.impl.readyState = self.HAVE_FUTURE_DATA;
        this.media.dispatchEvent( "canplay" );

        this.impl.readyState = self.HAVE_ENOUGH_DATA;
        this.media.dispatchEvent( "canplaythrough" );
      }
    };
      
    
    if ( !window.swfobject )
      Popcorn.getScript("http://archive.org/jw/popcorn/swfobject.js", Popcorn.ia[id].setup);
    else
      Popcorn.ia[id].setup();
  

    // Add the helper function _canPlaySrc so this works like other wrappers.
    
    
    var player=Popcorn.ia[id];

    player.media.play = function(){
      log('mplay');
      if (player.flash)
        player.flash.sendEvent('PLAY');
    };
    player.media.pause = function(){
      log('mpause');
      if (player.flash)
        player.flash.sendEvent('PLAY', false);
    };



    var isMuted = function() {
      if (!player.playerReady) 
        return false;
      return (player.flash.getConfig().mute ? true : false);
    };

    Object.defineProperties( player.media, {
      src: {
        get: function() {
          return player.impl.src;
        },
        set: function( aSrc ) {
          if( aSrc && aSrc !== player.impl.src ) {
            player.impl.src = aSrc;
            var tmp=aSrc.match(/archive\.org\/download\/([^\/]+)/);
            if (!tmp  ||  tmp.length != 2){
              alert('does not appear to be a valid "http://archive.org" download (perma)link.  cannot proceed.');
              return;
            }
            player.iaid = tmp[1];
            log('changeSrc: '+aSrc+', iaid: '+player.iaid);
          }
        }
      },
      muted: {
        get: function() {
          return isMuted();
        },
        set: function( val ) {
          if (!player.playerReady)
            return;
          
          if ( isMuted() !== val ) 
            player.flash.sendEvent('MUTE');
        }
      },
      volume:{
        set: function( val ) {
          if (!player.playerReady)
            return 1;
          
          var volNow = player.flash.getConfig().volume / 100;
              
          if ( !val || typeof val !== "number" || ( val < 0 || val > 1 ) ) {
            return volNow;
          }

          if ( volNow !== val ) {
            player.flash.sendEvent("VOLUME", val * 100 );
            //player.media.dispatchEvent( "volumechange" );//xxx
          }

          return volNow;
        },
        get: function() {
          if (!player.playerReady)
            return 1;
          
          return player.flash.getConfig().volume / 100;
        }
      },
      currentTime:{
        set:function( val ){
          if (!player.playerReady)
            return player.impl.currentTime;
          
          if ( !val )
            return player.impl.currentTime;

          player.impl.currentTime = Math.max(0,val);
          seeking = true;

          //player.media.dispatchEvent( "seeked" );//xxx
          //player.media.dispatchEvent( "timeupdate" );//xxx
              
          player.flash.sendEvent("SEEK", player.impl.currentTime ); // (float #seconds)
          
          return player.impl.currentTime;
        },
        get:function( ){
          return player.impl.currentTime;
        }
      }
    });
      

    
    return player.media;
  }






  function HTMLArchiveVideoElement( id ) {
    log(id);
    var parent = typeof id === "string" ? document.getElementById( id ) : id;//xxx
   
    var self = this;

    // Namespace all events we'll produce
    self._eventNamespace = Popcorn.guid( "HTMLArchiveVideoElement::" );

    self.parentNode = parent;

    // Mark type as Archive
    self._util.type = "Archive";


    log("new HTMLArchiveVideoElement()");
    return wrapMedia( id, self, parent );
  };


  HTMLArchiveVideoElement.prototype = new Popcorn._MediaElementProto();
  HTMLArchiveVideoElement.prototype.constructor = HTMLArchiveVideoElement;

   
  Popcorn.HTMLArchiveVideoElement = function( id ) {
    return new HTMLArchiveVideoElement( id );
  };



}( Popcorn, window.document ));
