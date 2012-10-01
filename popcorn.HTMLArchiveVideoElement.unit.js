
var testData = {

  videoSrc: "http://archive.org/details/commute",
  expectedDuration: 115.61215419501134,

  createMedia: function( id ) {
    return Popcorn.HTMLArchiveVideoElement( id );
  },

  shortVideoSrc: "http://archive.org/details/commute",
  shortExpectedDuration: 115.61215419501134

};
