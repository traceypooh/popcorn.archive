(function( window, Popcorn ) {

  Popcorn.player( "archive", {
    _canPlayType: function( nodeName, url ) {
      return ( typeof url === "string" &&
               Popcorn.HTMLArchiveVideoElement._canPlaySrc( url ) );
    }
  });

  Popcorn.archive = function( container, url, options ) {
    if ( typeof console !== "undefined" && console.warn ) {
      console.warn( "Deprecated player 'archive'. Please use Popcorn.HTMLArchiveVideoElement directly." );
    }

    var media = Popcorn.HTMLArchiveVideoElement( container ),
      popcorn = Popcorn( media, options );

    // Set the src "soon" but return popcorn instance first, so
    // the caller can get get error events.
    setTimeout( function() {
      media.src = url;
    }, 0 );

    return popcorn;
  };

}( window, Popcorn ));
