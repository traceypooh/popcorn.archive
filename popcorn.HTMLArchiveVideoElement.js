/**
 * The HTMLVideoElement and HTMLAudioElement are wrapped media elements
 * that are created within a DIV, and forward their properties and methods
 * to a wrapped object.
 */
(function( Popcorn, document ) {

  var debug=true;
  var playerReady = false;

  var log = function(obj){
    if (debug  &&  typeof console !='undefined'){
      console.log('================================');
      console.log(obj);
      console.log('================================');
    }
  };


  function canPlaySrc( src ) {
    // We can't really know based on URL.
    log('canPS');
    return "maybe";
  }

  window.flashReady = function() {
    log('flashReady!');
    playerReady = true;
  };
   
  

  var archiveInit = function( itemMetadata ){

    var id='video';//xxx
    var width=640;//xxxx
    var height=480 + (debug ? 30 : 0);//xxxx
    var identifier=itemMetadata.metadata.identifier;

    var bestfi=false;
    var audio=false;
    log(itemMetadata.files);
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
          "playerready":"window.flashReady",
          "id":id,
          "file":"%2Fdownload%2F"+identifier + encodeURIComponent('/'+bestfi.name)
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
          "name":identifier
        };


    //  extend options from user to flashvars. NOTE: Videos owned by Plus Archive users may override these options
    var options=[];
    
    Popcorn.extend( flashvars, options );

    params = {allowscriptaccess: "always",
              allowfullscreen: "true",
                enablejs: "true",
                seamlesstabbing: "true",
                wmode: "transparent"
             };
    

    swfobject.embedSWF( "http://archive.org/jw/player.swf", id,
                        width, (audio ? 60 : height), "9.0.0", "expressInstall.swf",
                        flashvars, params, attributes );
    

    log(playerReady);
  }
  ;
  //end var archiveInit = function()...

   
   
  function wrapMedia( id, mediaType ) {
    
    var parent = typeof id === "string" ? document.querySelector( id ) : id;

   
    var archiveSetup = function(){
      var identifier=['commute'];//xxx media.src.match(/([^/]+)$/);
      
      identifier=identifier[0];
      
      // this allows us to find the best video(/audio) file to play!
      Popcorn.getJSONP("http://archive.org/metadata/"+identifier+"?&callback=jsonp", archiveInit );
    };
    
    if ( !window.swfobject )
      Popcorn.getScript( "http://archive.org/jw/popcorn/swfobject.js", archiveSetup );
    else
      archiveSetup();
  

    // Add the helper function _canPlaySrc so this works like other wrappers.
    
    var media = document.createElement( mediaType );
    //var media = document.getElementById( id );
    //parent.appendChild( media );
    //media._canPlaySrc = canPlaySrc;

    //var flash = document.getElementById( 'video' );//xxxx
    window.flash = function() { return $('#video').get(0);/*xxxxx*/ };


    media.play = function(){
      log('mplay');
      flash().sendEvent('PLAY');
    };
    media.pause = function(){
      log('mpause');
      flash().sendEvent('PLAY', false);
    };


    var isMuted = function() {
      if (!playerReady) 
        return false;
      return (flash().getConfig().mute ? true : false);
    };

    Object.defineProperties( media, {
      src: {
        get: function() {
          return window.impl.src;
        },
        set: function( aSrc ) {
          if( aSrc && aSrc !== window.impl.src ) {
            log(aSrc);
            //changeSrc( aSrc );//xxxxxxx
          }
        }
      },
      muted: {
        get: function() {
          return isMuted();
        },
        set: function( aSrc ) {
          log(aSrc);
          if ( isMuted() !== aSrc ) 
            flash().sendEvent('MUTE');
        }
      },
      volume:{
        set: function( val ) {
          if (!playerReady)
            return 1;
          
          var volNow = flash().getConfig().volume / 100;
              
          if ( !val || typeof val !== "number" || ( val < 0 || val > 1 ) ) {
            return volNow;
          }

          if ( volNow !== val ) {
            flash().sendEvent("VOLUME", val * 100 );
            media.dispatchEvent( "volumechange" );
            log('volly');
          }

          return volNow;
        },
        get: function() {
          if (!playerReady)
            return 1;
          
          return flash().getConfig().volume / 100;
        }
      }
    });
      

    
    return media;
  }






  function HTMLArchiveVideoElement( id ) {
    var self = this;
    var EMPTY_STRING = "",
      MIN_WIDTH = 320,
      MIN_HEIGHT = 240;

    window.impl = {
        src: EMPTY_STRING,
        networkState: self.NETWORK_EMPTY,
        readyState: self.HAVE_NOTHING,
        seeking: false,
        autoplay: EMPTY_STRING,
        preload: EMPTY_STRING,
        controls: false,
        loop: false,
        poster: EMPTY_STRING,
        volume: 1,
        // Vimeo has no concept of muted, store volume values
        // such that muted===0 is unmuted, and muted>0 is muted.
        muted: 0,
        currentTime: 0,
        duration: NaN,
        ended: false,
        paused: true,
        width: parent.width|0   ? parent.width  : MIN_WIDTH,
        height: parent.height|0 ? parent.height : MIN_HEIGHT,
        error: null
    };
    
    
    // Namespace all events we'll produce
    self._eventNamespace = Popcorn.guid( "HTMLArchiveVideoElement::" );

    self.parentNode = parent;

    // Mark type as Archive
    self._util.type = "Archive";



    log("new HTMLArchiveVideoElement()");
    return wrapMedia( id, "video" );
  };


  HTMLArchiveVideoElement.prototype = new Popcorn._MediaElementProto();
  HTMLArchiveVideoElement.prototype.constructor = HTMLArchiveVideoElement;

   
  Popcorn.HTMLArchiveVideoElement = function( id ) {
    return new HTMLArchiveVideoElement( id );
  };



}( Popcorn, window.document ));
