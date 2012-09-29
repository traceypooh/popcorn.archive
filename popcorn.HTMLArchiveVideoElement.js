/**
 * The HTMLVideoElement and HTMLAudioElement are wrapped media elements
 * that are created within a DIV, and forward their properties and methods
 * to a wrapped object.
 */
(function( Popcorn, document ) {

    var debug=true;
    var log = function(obj){
      if (debug){
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

  

  function wrapMedia( id, mediaType ) {
    
    var parent = typeof id === "string" ? document.querySelector( id ) : id;


    

  var archiveInit = function( itemMetadata ){
    var identifier='commute', width=320, height=240;//xxxx
    
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
          "playerready":"archivePlayer.ready",
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
        }
        

        attributes = {
          "name":identifier
        };


    //  extend options from user to flashvars. NOTE: Videos owned by Plus Archive users may override these options
    var options=[];
    
    Popcorn.extend( flashvars, options );
    

    params = {
    allowscriptaccess: "always",
    allowfullscreen: "true",
    enablejs: "true",
    seamlesstabbing: "true",
    wmode: "transparent"
    }
    ;
    

    swfobject.embedSWF( "http://archive.org/jw/player.swf", id,
                        width, (audio ? 60 : height), "9.0.0", "expressInstall.swf",
                        flashvars, params, attributes );
    


    //xxxxxxxxx  
  }
  ;
  //end var archiveInit = function()...

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
    var flash = function() { return $('#video').get(0);/*xxxxx*/ 
    }
    

    media.play = function(){
      log('mplay');
      flash().sendEvent('PLAY');
    }
    media.pause = function(){
      log('mpause');
      flash().sendEvent('PLAY', false);
    }


    Object.defineProperties( media, {
      src: {
        get: function() {
          return impl.src;
        },
        set: function( aSrc ) {
          if( aSrc && aSrc !== impl.src ) {
            changeSrc( aSrc );
          }
        }
      },
      muted: {
        get: function() {
            log('muted get');
            return (flash().getConfig().mute ? true : false);
        },
        set: function( aSrc ) {
            log('muted set');
            flash().sendEvent('MUTE');
        }
      }
    });
      

    
    return media;
  }



/*
  Popcorn.HTMLArchiveVideoElement = function( id ) {
    log("new HTMLArchiveVideoElement()");
    return wrapMedia( id, "video" );
  };
  Popcorn.HTMLArchiveVideoElement._canPlaySrc = canPlaySrc;

  Popcorn.HTMLArchiveVideoElement._onPlay = onPlay;
  Popcorn.HTMLArchiveVideoElement._changeSrc = changeSrc;


  Popcorn.HTMLAudioElement = function( id ) {
    return wrapMedia( id, "audio" );
  };
  Popcorn.HTMLAudioElement._canPlaySrc = canPlaySrc;
*/




  function HTMLArchiveVideoElement( id ) {
    var self = this;
    var EMPTY_STRING = "",
  // Vimeo doesn't give a suggested min size, YouTube suggests 200x200
  // as minimum, video spec says 300x150.
  MIN_WIDTH = 300,
  MIN_HEIGHT = 200;
    
var
      impl = {
        src: EMPTY_STRING,
        networkState: self.NETWORK_EMPTY,
        readyState: self.HAVE_NOTHING,
        seeking: false,
        autoplay: EMPTY_STRING,
        preload: EMPTY_STRING,
        controls: false,
        loop: false,
        poster: EMPTY_STRING,
        // Vimeo seems to use .77 as default
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
      },
  playerReady = false;
  



    self.play = function() {
      log('play()');
    }

    function onPlayerReady( event ) {
      log('onplayerRready');
    }
    function changeSrc( aSrc ) {
      log('changeSrc');
    }
    
    
    
    // Namespace all events we'll produce
    self._eventNamespace = Popcorn.guid( "HTMLArchiveVideoElement::" );

    self.parentNode = parent;

    // Mark type as Vimeo
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
