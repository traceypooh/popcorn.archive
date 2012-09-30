
var testData = {

  videoSrc: "http://archive.org/download/commute/commute.mp4",
  expectedDuration: 115.61215419501134,

  createMedia: function( id ) {
    return Popcorn.HTMLArchiveVideoElement( id );
  },

  shortVideoSrc: "http://archive.org/download/commute/commute.mp4",
  shortExpectedDuration: 115.61215419501134

};
