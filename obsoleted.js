// A global callback for archive.. yuck.
var archivePlayer = function( playerId ) {
  archivePlayer[ playerId ] && archivePlayer[ playerId ]();
};
archivePlayer.stateChanged = {};
archivePlayer.timed = {};
archivePlayer.buffered = {};
archivePlayer.loaded = {};
archivePlayer.volumed = {};
archivePlayer.muted = {};
archivePlayer.errored = {};


Popcorn.player( "archive", {

  _canPlayType: function( nodeName, url ) {
    return (/(?:http:\/\/www\.|http:\/\/|www\.|\.|^)(archive)/).test( url ) && nodeName.toLowerCase() !== "video";
  },

  _setup: function( options ) {

      var media = this,
          debug = true,
          archiveContainer = document.createElement( "div" ),
          flash,
          autoPlay = true,
          firstPlay = false,
          currentTime = 0,
          seekTime = 0,
          seeking = false,
          lastMuted = false,
          height,
          width;

      media.paused = true;
      archiveContainer.id = media.id + Popcorn.guid();
      options.destroyId = archiveContainer.id;

      media.appendChild( archiveContainer );

      // setting archive player's height and width, default to 640 x 480
      width = media.style.width ? "" + media.offsetWidth : "640";
      height = media.style.height ? "" + media.offsetHeight : "480";
      

      var archiveInit = function( itemMetadata ) {

        var flashvars,
            params,
            attributes = {},
            src = media.src,
            canPlayThru= false,
            loadStarted = false;
        
        var log = function(obj){
          if (debug)
            console.log(obj);
        };
        
        
        log(itemMetadata);
        
        archivePlayer.ready = function(obj) {
          flash = document.getElementById( archiveContainer.id );
          if (debug) {
            log('playerready event!');
            log('flash setup for archiveContainer.id: '+archiveContainer.id);
            window.flash = flash; // global makes debugging easier if/as needed
            window.media = media; // global makes debugging easier if/as needed

            // some very useful elements in getConfig():
            //    start, state, duration, volume, mute, autostart (etc.)
            log('flash.getConfig():');
            log(flash.getConfig());
          }
          
          // Found gems from: 
          // http://www.longtailvideo.com/jw/?item=Javascript_API_Examples
          // https://github.com/kcivey/jquery.jwplayer/blob/master/jquery.jwplayer.js
          // flash.sendEvent('STOP');
          // flash.sendEvent('LOAD', [file]);

          // setup this specific player (since we can have 2+ players)
          archivePlayer[ archiveContainer.id ]();

          
          flash.addModelListener     ("STATE", "archivePlayer.stateChanged."+archiveContainer.id);
          flash.addModelListener     ("TIME" , "archivePlayer.timed."       +archiveContainer.id);
          flash.addModelListener     ("BUFFER","archivePlayer.buffered."    +archiveContainer.id);
          flash.addModelListener     ("LOADED","archivePlayer.loaded."      +archiveContainer.id);
          flash.addControllerListener("VOLUME","archivePlayer.volumed."     +archiveContainer.id);
          flash.addControllerListener("MUTE",  "archivePlayer.muted."       +archiveContainer.id);
          flash.addModelListener     ("ERROR", "archivePlayer.errored."     +archiveContainer.id);
          
          if (autoPlay)
            flash.sendEvent('PLAY');
        };


        
        
        // setup functions for this specific player (since we can have 2+)
        archivePlayer[ archiveContainer.id ] = function() {
          
          archivePlayer.stateChanged[ archiveContainer.id ] = function( state ){
            // IDLE, BUFFERING, PLAYING, PAUSED, COMPLETED
            log('STATE change: '+state.oldstate+' => '+state.newstate);
            log(state);
            
            if (state.newstate=='PLAYING'){
              log('playI');
              if (!firstPlay) {
                firstPlay = true;

                if (!loadStarted){
                  loadStarted = true;
                  media.dispatchEvent( "loadstart" );
                }
                
                media.dispatchEvent( "loadedmetadata" );
                media.dispatchEvent( "loadeddata" );

                media.play();
                media.readyState = 4;
              }
              
                
              if ( media.paused ) {
                log('play');
                media.paused = false;
                media.dispatchEvent( "play" );
                media.dispatchEvent( "playing" );
              }
            }
            else if (state.newstate=='PAUSED'){
              log('pauseI');
              if ( !media.paused ) {
                log('pause');
                media.paused = true;
                media.dispatchEvent( "pause" );
              }
            }
          };
          
          
          archivePlayer.timed[ archiveContainer.id ] = function( obj ){
            var diff = Math.round(10 * (obj.position - currentTime)) / 10;
            log('TIME now: '+obj.position+', diff: '+diff+' sec');
            
            // bleah, if we can only monitor time update events, and they come in
            // every 1/10th of a second, i guess if change
            if ( obj.position !== currentTime  &&  (diff < 0  ||  diff > 0.2 )) {
              log('controlbar SEEK');
              currentTime = obj.position;
              media.dispatchEvent( "seeked" );
              media.dispatchEvent( "timeupdate" );
            }
            else if ( !media.paused ) {
              currentTime = obj.position;
              media.dispatchEvent("timeupdate");
            }
          };
          

          archivePlayer.buffered[ archiveContainer.id ] = function( obj ){
            log('BUFFER');
            log(obj);
            if (!loadStarted){
              loadStarted = true;
              media.dispatchEvent( "loadstart" );
            }
            var duration = flash.getConfig().duration;
            if (duration != media.duration){
              log('duration: '+duration);
              media.duration = duration;
              media.dispatchEvent( "durationchange" );
            }
            if (!canPlayThru  &&  duration > 0  &&  (obj.percentage * duration / 100) > 3){
              log('3+ seconds BUFFERED');
              canPlayThru = true;
              media.dispatchEvent( "canplaythrough" );              
            }
          };
          

          archivePlayer.loaded[ archiveContainer.id ] = function( obj ) {//xxx
            log('LOADED');
            log(obj);
          };


          archivePlayer.volumed[ archiveContainer.id ] = function( obj ) {
            log('VOLUME');
            log(obj);
            media.volume = obj.percentage / 100; // seems to be correct!
            media.dispatchEvent( "volumechange" );
          };
          
          
          archivePlayer.muted[ archiveContainer.id ] = function( obj ) {
            log('MUTE');
            log(obj);
          };
          
          
          archivePlayer.errored[ archiveContainer.id ] = function( obj ) {//xxx
            log('ERROR');
            log(obj);
          };




          
          media.play = function() {
            log('play2');
            media.paused = false;
            media.dispatchEvent( "play" );

            media.dispatchEvent( "playing" );
            flash.sendEvent('PLAY', true);
          };

          media.pause = function() {
            log('pause2');

            if ( !media.paused ) {

              media.paused = true;
              media.dispatchEvent( "pause" );
              flash.sendEvent('PLAY', false);
            }
          };

          Popcorn.player.defineProperty( media, "currentTime", {

            set: function( val ) {

              if ( !val ) {
                return currentTime;
              }

              currentTime = seekTime = +val;
              seeking = true;

              media.dispatchEvent( "seeked" );
              media.dispatchEvent( "timeupdate" );
              
              flash.sendEvent("SEEK", currentTime ); // (float #seconds)

              return currentTime;
            },

            get: function() {

              return currentTime;
            }
          });


          var isMuted = function() {
            return (flash.getConfig().mute ? true : false);
          };

          Popcorn.player.defineProperty( media, "muted", {

            set: function( val ) {
              if ( isMuted() !== val ) {
                  flash.sendEvent('MUTE');
              }
            },
            get: function() {
              return isMuted();
            }
          });

          Popcorn.player.defineProperty( media, "volume", {

            set: function( val ) {
              var volNow = flash.getConfig().volume / 100;
              
              if ( !val || typeof val !== "number" || ( val < 0 || val > 1 ) ) {
                return volNow;
              }

              if ( volNow !== val ) {
                flash.sendEvent("VOLUME", val * 100 );
                media.dispatchEvent( "volumechange" );
                log('volly');
              }

              return volNow;
            },
            get: function() {
              return flash.getConfig().volume / 100;
            }
          });
        }; // end archivePlayer[ archiveContainer.id ] = function() {
        
        

        var identifier = itemMetadata.metadata.identifier;
        log('url: '+src+' ==> identifier: '+identifier);
      
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
        
        
        flashvars = {
          "netstreambasepath":"http%3A%2F%2Farchive.org%2F",
          "controlbar.position":(audio ? "top" : "over"),
          "playerready":"archivePlayer.ready",
          "id":archiveContainer.id,
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
          "name":archiveContainer.id
        };

        //  extend options from user to flashvars. NOTE: Videos owned by Plus Archive users may override these options
        Popcorn.extend( flashvars, options );

        params = {
          allowscriptaccess: "always",
          allowfullscreen: "true",
          enablejs: "true",
          seamlesstabbing: "true",
          wmode: "transparent"
        };

        swfobject.embedSWF( "http://archive.org/jw/player.swf", archiveContainer.id,
                            width, (audio ? 60 : height), "9.0.0", "expressInstall.swf",
                            flashvars, params, attributes );

      }; //end var archiveInit = function()...

      var archiveSetup = function()
      {
        var identifier=media.src.match(/([^/]+)$/);
        identifier=identifier[0];
        // this allows us to find the best video(/audio) file to play!
        Popcorn.getJSONP("http://archive.org/metadata/"+identifier+"?&callback=jsonp", archiveInit );
      };
    
      if ( !window.swfobject )
        Popcorn.getScript( "http://archive.org/jw/popcorn/swfobject.js", archiveSetup );
      else
        archiveSetup();
  }, // end _setup: function(..

  _teardown: function( options ) {
    options.destroyed = true;
    var flash = document.getElementById( options.destroyId );
    if (flash)
      flash.sendEvent("STOP");
    this.removeChild( document.getElementById( options.destroyId ) );
  }

});
